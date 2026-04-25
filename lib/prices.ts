import { getFiatUsdRates } from '@/lib/fx'
import type { PerformanceRange } from '@/types'

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
}

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com'
const TWELVE_DATA_QUOTE_CACHE_TTL_MS = 60 * 1000
const TWELVE_DATA_HISTORY_CACHE_TTL_MS = 3 * 60 * 1000

type CacheEntry<T> = {
  expiresAt: number
  value: T
}

const twelveDataMemoryCache = new Map<string, CacheEntry<unknown>>()
const twelveDataInFlight = new Map<string, Promise<unknown>>()

type TwelveDataQuote = {
  symbol?: string
  close?: string
  previous_close?: string
  percent_change?: string
  change_percent?: string
}

type TwelveDataTimeSeriesPoint = {
  datetime?: string
  close?: string
}

type TwelveDataTimeSeriesPayload = {
  symbol?: string
  values?: TwelveDataTimeSeriesPoint[]
  status?: string
  code?: number
  message?: string
}

type TwelveDataSymbolSearchItem = {
  symbol?: string
  instrument_name?: string
  name?: string
  type?: string
}

function getTwelveDataApiKey(): string | null {
  const key = process.env.TWELVE_DATA_API_KEY?.trim()
  return key ? key : null
}

function parseMaybeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeStockSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
}

function buildTwelveDataCacheKey(kind: string, params: Record<string, string>): string {
  const serialized = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return `${kind}:${serialized}`
}

async function withTwelveDataCache<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  const cached = twelveDataMemoryCache.get(key)
  if (cached && cached.expiresAt > now) return cached.value as T

  const active = twelveDataInFlight.get(key)
  if (active) return active as Promise<T>

  const next = producer()
    .then((value) => {
      twelveDataMemoryCache.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .finally(() => {
      twelveDataInFlight.delete(key)
    })

  twelveDataInFlight.set(key, next as Promise<unknown>)
  return next
}

function parseTwelveDataError(data: unknown): { code?: number; message?: string } | null {
  if (!data || typeof data !== 'object') return null
  const code = (data as { code?: unknown }).code
  const message = (data as { message?: unknown }).message
  return {
    code: typeof code === 'number' ? code : undefined,
    message: typeof message === 'string' ? message : undefined,
  }
}

async function fetchTwelveDataJson<T>(
  endpoint: string,
  params: Record<string, string>,
  revalidateSeconds: number
): Promise<T | null> {
  const apiKey = getTwelveDataApiKey()
  if (!apiKey) {
    console.warn('TWELVE_DATA_API_KEY is not set; stock prices will be unavailable')
    return null
  }
  const search = new URLSearchParams({ ...params, apikey: apiKey })
  const url = `${TWELVE_DATA_BASE_URL}${endpoint}?${search.toString()}`
  try {
    const res = await fetch(url, { next: { revalidate: revalidateSeconds } })
    const data = (await res.json().catch(() => null)) as T | null
    if (!res.ok) {
      const err = parseTwelveDataError(data)
      if (res.status === 429 || err?.code === 429) {
        console.warn(`Twelve Data rate limit hit for ${endpoint}`)
      } else {
        console.warn(`Twelve Data request failed for ${endpoint}: ${res.status} ${res.statusText}`)
      }
      return null
    }
    const err = parseTwelveDataError(data)
    if (err?.code) {
      if (err.code === 429) console.warn(`Twelve Data rate limit hit for ${endpoint}`)
      else console.warn(`Twelve Data error (${err.code}) for ${endpoint}: ${err.message ?? 'Unknown error'}`)
      return null
    }
    return data
  } catch (error) {
    console.warn(`Twelve Data network failure for ${endpoint}`, error)
    return null
  }
}

function parseQuoteMap(data: unknown): Record<string, TwelveDataQuote> {
  if (!data || typeof data !== 'object') return {}

  if ('symbol' in data) {
    const item = data as TwelveDataQuote
    const symbol = item.symbol?.toUpperCase()
    if (symbol) return { [symbol]: item }
    return {}
  }

  const out: Record<string, TwelveDataQuote> = {}
  for (const [symbol, value] of Object.entries(data)) {
    if (!value || typeof value !== 'object') continue
    out[symbol.toUpperCase()] = value as TwelveDataQuote
  }
  return out
}

function parseHistoryMap(data: unknown): Record<string, TwelveDataTimeSeriesPayload> {
  if (!data || typeof data !== 'object') return {}
  if ('values' in data || 'symbol' in data) {
    const one = data as TwelveDataTimeSeriesPayload
    const symbol = one.symbol?.toUpperCase()
    return symbol ? { [symbol]: one } : {}
  }

  const out: Record<string, TwelveDataTimeSeriesPayload> = {}
  for (const [symbol, value] of Object.entries(data)) {
    if (!value || typeof value !== 'object') continue
    out[symbol.toUpperCase()] = value as TwelveDataTimeSeriesPayload
  }
  return out
}

async function getStockQuotes(symbols: string[]): Promise<Record<string, TwelveDataQuote>> {
  const normalized = normalizeStockSymbols(symbols)
  if (normalized.length === 0) return {}
  const key = buildTwelveDataCacheKey('quote', { symbol: normalized.join(',') })
  return withTwelveDataCache(key, TWELVE_DATA_QUOTE_CACHE_TTL_MS, async () => {
    const data = await fetchTwelveDataJson<unknown>('/quote', { symbol: normalized.join(',') }, 60)
    return parseQuoteMap(data)
  })
}

async function getStockTimeSeries(
  symbols: string[],
  interval: string,
  outputsize: number,
  revalidateSeconds: number
): Promise<Record<string, TwelveDataTimeSeriesPayload>> {
  const normalized = normalizeStockSymbols(symbols)
  if (normalized.length === 0) return {}
  const key = buildTwelveDataCacheKey('time_series', {
    symbol: normalized.join(','),
    interval,
    outputsize: String(outputsize),
  })
  return withTwelveDataCache(key, TWELVE_DATA_HISTORY_CACHE_TTL_MS, async () => {
    const data = await fetchTwelveDataJson<unknown>(
      '/time_series',
      {
        symbol: normalized.join(','),
        interval,
        outputsize: String(outputsize),
        timezone: 'UTC',
        order: 'ASC',
      },
      revalidateSeconds
    )
    return parseHistoryMap(data)
  })
}

export async function getStockCloses(
  symbols: string[],
  interval: string,
  outputsize: number,
  revalidateSeconds: number
): Promise<Record<string, number[]>> {
  const rows = await getStockTimeSeries(symbols, interval, outputsize, revalidateSeconds)
  const out: Record<string, number[]> = {}
  for (const [symbol, payload] of Object.entries(rows)) {
    const closes: number[] = []
    for (const value of payload.values ?? []) {
      const close = parseMaybeNumber(value.close)
      if (close != null && close > 0) closes.push(close)
    }
    out[symbol] = closes
  }
  return out
}

export function getCoinGeckoId(symbol: string): string | undefined {
  return COINGECKO_IDS[symbol.toUpperCase()]
}

export async function getCryptoPricesByCoingeckoIds(ids: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return {}
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${unique.join(',')}&vs_currencies=usd`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return {}
  const data = (await res.json()) as Record<string, { usd?: number }>
  const result: Record<string, number> = {}
  unique.forEach((id) => {
    if (data[id]?.usd != null) result[id] = data[id].usd!
  })
  return result
}

export async function getCryptoPrices(symbols: string[]): Promise<Record<string, number>> {
  const upper = symbols.map((s) => s.toUpperCase())
  const ids = upper.map((s) => COINGECKO_IDS[s]).filter(Boolean).join(',')
  if (!ids) return {}
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return {}
  const data = (await res.json()) as Record<string, { usd?: number }>
  const result: Record<string, number> = {}
  upper.forEach((symbol) => {
    const id = COINGECKO_IDS[symbol]
    if (id && data[id]?.usd != null) result[symbol] = data[id].usd!
  })
  return result
}

export type CryptoQuote = { price: number; change_24h?: number }

export async function getCryptoQuotes(symbols: string[]): Promise<Record<string, CryptoQuote>> {
  const upper = symbols.map((s) => s.toUpperCase())
  const ids = upper.map((s) => COINGECKO_IDS[s]).filter(Boolean).join(',')
  if (!ids) return {}
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return {}
  const data = (await res.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number }
  >
  const result: Record<string, CryptoQuote> = {}
  upper.forEach((symbol) => {
    const id = COINGECKO_IDS[symbol]
    if (id && data[id]?.usd != null) {
      result[symbol] = {
        price: data[id].usd!,
        change_24h: data[id].usd_24h_change,
      }
    }
  })
  return result
}

export async function getCryptoQuotesByCoingeckoIds(
  idBySymbol: Map<string, string>
): Promise<Record<string, CryptoQuote>> {
  const ids = [...new Set(idBySymbol.values())]
  if (ids.length === 0) return {}
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return {}
  const data = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>
  const result: Record<string, CryptoQuote> = {}
  idBySymbol.forEach((cgId, symbol) => {
    if (data[cgId]?.usd != null) {
      result[symbol.toUpperCase()] = {
        price: data[cgId].usd!,
        change_24h: data[cgId].usd_24h_change,
      }
    }
  })
  return result
}

export async function getStockPrices(symbols: string[]): Promise<Record<string, number>> {
  const quotes = await getStockQuotes(symbols)
  const result: Record<string, number> = {}
  for (const symbol of normalizeStockSymbols(symbols)) {
    const quote = quotes[symbol]
    if (!quote) continue
    const price =
      parseMaybeNumber(quote.close) ??
      parseMaybeNumber((quote as { price?: string }).price) ??
      parseMaybeNumber((quote as { last?: string }).last)
    if (price != null && price > 0) result[symbol] = price
  }
  return result
}

export type PriceKey = {
  id: string
  symbol: string
  asset_type: string
  coingecko_id?: string | null
}

export type TimePricePoint = {
  timestamp: number
  price: number
}

const RANGE_CONFIG: Record<
  Lowercase<PerformanceRange>,
  { durationMs: number; intervalMinutes: number; label: PerformanceRange }
> = {
  '24h': { durationMs: 24 * 60 * 60 * 1000, intervalMinutes: 15, label: '24H' },
  '7d': { durationMs: 7 * 24 * 60 * 60 * 1000, intervalMinutes: 120, label: '7D' },
  '1m': { durationMs: 30 * 24 * 60 * 60 * 1000, intervalMinutes: 24 * 60, label: '1M' },
  '3m': { durationMs: 90 * 24 * 60 * 60 * 1000, intervalMinutes: 24 * 60, label: '3M' },
  '1y': { durationMs: 365 * 24 * 60 * 60 * 1000, intervalMinutes: 7 * 24 * 60, label: '1Y' },
}

type SupportedRangeKey = keyof typeof RANGE_CONFIG

function clampCoinGeckoDays(range: SupportedRangeKey): number {
  if (range === '24h') return 1
  if (range === '7d') return 7
  if (range === '1m') return 30
  if (range === '3m') return 90
  return 365
}

function mapRangeToStockRequest(range: SupportedRangeKey): {
  interval: string
  outputsize: number
  revalidateSeconds: number
} {
  if (range === '24h') return { interval: '15min', outputsize: 96, revalidateSeconds: 120 }
  if (range === '7d') return { interval: '2h', outputsize: 84, revalidateSeconds: 300 }
  if (range === '1m') return { interval: '1day', outputsize: 40, revalidateSeconds: 600 }
  if (range === '3m') return { interval: '1day', outputsize: 120, revalidateSeconds: 900 }
  return { interval: '1week', outputsize: 60, revalidateSeconds: 1800 }
}

export function toRangeKey(range: PerformanceRange | string): SupportedRangeKey {
  const normalized = String(range).trim().toLowerCase() as SupportedRangeKey
  return normalized in RANGE_CONFIG ? normalized : '24h'
}

/** USD price per unit of the holding, keyed by holding id */
export async function getLivePrices(items: PriceKey[]): Promise<Record<string, number>> {
  const fiatRates = await getFiatUsdRates()
  const out: Record<string, number> = {}

  const cryptoByCoingecko = new Map<string, { holdingId: string; symbol: string }[]>()
  const cryptoLegacySymbols: string[] = []

  for (const h of items) {
    if (h.asset_type === 'cash') {
      const sym = h.symbol.toUpperCase()
      const rate = fiatRates[sym]
      if (rate != null) out[h.id] = rate
      continue
    }
    if (h.asset_type === 'crypto') {
      const cg = h.coingecko_id?.trim()
      if (cg) {
        const list = cryptoByCoingecko.get(cg) ?? []
        list.push({ holdingId: h.id, symbol: h.symbol })
        cryptoByCoingecko.set(cg, list)
      } else {
        cryptoLegacySymbols.push(h.symbol)
      }
    }
  }

  const stockSymbols = items.filter((h) => h.asset_type === 'stock').map((h) => h.symbol)

  const coingeckoIds = [...cryptoByCoingecko.keys()]
  const [idPrices, legacyCryptoPrices, stockPrices] = await Promise.all([
    coingeckoIds.length
      ? getCryptoPricesByCoingeckoIds(coingeckoIds)
      : Promise.resolve({} as Record<string, number>),
    cryptoLegacySymbols.length
      ? getCryptoPrices([...new Set(cryptoLegacySymbols)])
      : Promise.resolve({} as Record<string, number>),
    stockSymbols.length
      ? getStockPrices([...new Set(stockSymbols)])
      : Promise.resolve({} as Record<string, number>),
  ])

  for (const [cgId, holders] of cryptoByCoingecko) {
    const p = idPrices[cgId]
    if (p != null) {
      for (const { holdingId } of holders) out[holdingId] = p
    }
  }

  for (const h of items) {
    if (h.asset_type !== 'crypto' || h.coingecko_id) continue
    const sym = h.symbol.toUpperCase()
    const p = legacyCryptoPrices[sym]
    if (p != null) out[h.id] = p
  }

  for (const h of items) {
    if (h.asset_type !== 'stock') continue
    const p = stockPrices[h.symbol.toUpperCase()]
    if (p != null) out[h.id] = p
  }

  return out
}

/** Approximate 24h change % per symbol for dashboard performance bars */
export async function getLiveChangePercent(items: PriceKey[]): Promise<Record<string, number>> {
  const idBySymbol = new Map<string, string>()
  const legacyCryptoSymbols: string[] = []
  const stockSymbols: string[] = []

  for (const h of items) {
    if (h.asset_type === 'cash') continue
    if (h.asset_type === 'crypto') {
      const cg = h.coingecko_id?.trim()
      if (cg) idBySymbol.set(h.symbol, cg)
      else legacyCryptoSymbols.push(h.symbol)
    } else if (h.asset_type === 'stock') {
      stockSymbols.push(h.symbol)
    }
  }

  const [cgQuotes, cryptoQuotes, stockChanges] = await Promise.all([
    idBySymbol.size ? getCryptoQuotesByCoingeckoIds(idBySymbol) : Promise.resolve({}),
    legacyCryptoSymbols.length ? getCryptoQuotes([...new Set(legacyCryptoSymbols)]) : Promise.resolve({}),
    stockSymbols.length ? getStockChangePercents([...new Set(stockSymbols)]) : Promise.resolve({}),
  ])

  const out: Record<string, number> = { ...stockChanges }
  ;(Object.entries(cryptoQuotes) as [string, CryptoQuote][]).forEach(([sym, q]) => {
    if (q.change_24h != null && !Number.isNaN(q.change_24h)) out[sym] = q.change_24h
  })
  ;(Object.entries(cgQuotes) as [string, CryptoQuote][]).forEach(([sym, q]) => {
    if (q.change_24h != null && !Number.isNaN(q.change_24h)) out[sym.toUpperCase()] = q.change_24h
  })
  return out
}

function normalizeToBucketPoints(
  points: TimePricePoint[],
  bucketTimestamps: number[]
): TimePricePoint[] {
  if (points.length === 0 || bucketTimestamps.length === 0) return []
  const sorted = [...points]
    .filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.price) && p.price > 0)
    .sort((a, b) => a.timestamp - b.timestamp)
  if (sorted.length === 0) return []

  const out: TimePricePoint[] = []
  let idx = 0
  let lastPrice: number | null = null
  for (const ts of bucketTimestamps) {
    while (idx < sorted.length && sorted[idx].timestamp <= ts) {
      lastPrice = sorted[idx].price
      idx += 1
    }
    const price = lastPrice ?? sorted[0].price
    out.push({ timestamp: ts, price })
  }
  return out
}

function makeBucketTimestamps(durationMs: number, intervalMinutes: number): number[] {
  const now = Date.now()
  const intervalMs = intervalMinutes * 60 * 1000
  const alignedNow = Math.floor(now / intervalMs) * intervalMs
  const start = alignedNow - durationMs
  const out: number[] = []
  for (let t = start; t <= alignedNow; t += intervalMs) out.push(t)
  return out
}

async function getCryptoHistoryByCoingeckoIds(
  ids: string[],
  bucketTimestamps: number[],
  range: SupportedRangeKey
): Promise<Record<string, TimePricePoint[]>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return {}
  const days = clampCoinGeckoDays(range)
  const pairs = await Promise.all(
    unique.map(async (id) => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
          { next: { revalidate: 60 } }
        )
        if (!res.ok) return [id, []] as const
        const data = (await res.json()) as { prices?: [number, number][] }
        const points: TimePricePoint[] =
          data.prices?.map(([timestamp, price]) => ({ timestamp, price })) ?? []
        return [id, normalizeToBucketPoints(points, bucketTimestamps)] as const
      } catch (e) {
        console.error(`Failed ${range} history for ${id}`, e)
        return [id, []] as const
      }
    })
  )
  return Object.fromEntries(pairs)
}

async function getStockHistoryByRange(
  symbols: string[],
  bucketTimestamps: number[],
  range: SupportedRangeKey
): Promise<Record<string, TimePricePoint[]>> {
  const unique = normalizeStockSymbols(symbols)
  if (unique.length === 0) return {}
  const stockRequest = mapRangeToStockRequest(range)
  const seriesBySymbol = await getStockTimeSeries(
    unique,
    stockRequest.interval,
    stockRequest.outputsize,
    stockRequest.revalidateSeconds
  )
  const out: Record<string, TimePricePoint[]> = {}
  for (const symbol of unique) {
    const series = seriesBySymbol[symbol]?.values ?? []
    const points: TimePricePoint[] = []
    for (const value of series) {
      const close = parseMaybeNumber(value.close)
      if (close == null || close <= 0) continue
      const rawDatetime = value.datetime?.trim()
      if (!rawDatetime) continue
      const timestamp = Date.parse(
        /[zZ]|[+-]\d{2}:?\d{2}$/.test(rawDatetime) ? rawDatetime : `${rawDatetime}Z`
      )
      if (!Number.isFinite(timestamp)) continue
      points.push({ timestamp, price: close })
    }
    out[symbol] = normalizeToBucketPoints(points, bucketTimestamps)
  }
  return out
}

export async function getLivePriceHistoryByHoldingId(
  items: PriceKey[],
  range: PerformanceRange | string
): Promise<Record<string, TimePricePoint[]>> {
  const rangeKey = toRangeKey(range)
  const config = RANGE_CONFIG[rangeKey]
  const buckets = makeBucketTimestamps(config.durationMs, config.intervalMinutes)
  const cryptoByCoingecko = new Map<string, string[]>()
  const legacyCryptoSymbols: string[] = []
  const stockSymbols: string[] = []

  for (const h of items) {
    if (h.asset_type === 'cash') continue
    if (h.asset_type === 'crypto') {
      const cg = h.coingecko_id?.trim()
      if (cg) {
        const list = cryptoByCoingecko.get(cg) ?? []
        list.push(h.id)
        cryptoByCoingecko.set(cg, list)
      } else {
        legacyCryptoSymbols.push(h.symbol.toUpperCase())
      }
      continue
    }
    if (h.asset_type === 'stock') stockSymbols.push(h.symbol.toUpperCase())
  }

  const [cgSeries, legacyCryptoSeries, stockSeries] = await Promise.all([
    getCryptoHistoryByCoingeckoIds([...cryptoByCoingecko.keys()], buckets, rangeKey),
    getCryptoHistoryByCoingeckoIds(
      [...new Set(legacyCryptoSymbols)]
        .map((symbol) => getCoinGeckoId(symbol))
        .filter((id): id is string => Boolean(id)),
      buckets,
      rangeKey
    ),
    getStockHistoryByRange(stockSymbols, buckets, rangeKey),
  ])

  const out: Record<string, TimePricePoint[]> = {}
  for (const h of items) {
    if (h.asset_type === 'cash') continue
    if (h.asset_type === 'stock') {
      out[h.id] = stockSeries[h.symbol.toUpperCase()] ?? []
      continue
    }
    const cg = h.coingecko_id?.trim()
    if (cg) {
      out[h.id] = cgSeries[cg] ?? []
      continue
    }
    const legacyId = getCoinGeckoId(h.symbol)
    out[h.id] = legacyId ? legacyCryptoSeries[legacyId] ?? [] : []
  }
  return out
}

/** 24h normalized price series per holding id, preserved for backwards compatibility. */
export async function getLivePriceHistory24hByHoldingId(
  items: PriceKey[]
): Promise<Record<string, TimePricePoint[]>> {
  return getLivePriceHistoryByHoldingId(items, '24H')
}

export async function getHoldingChangePercents(
  items: PriceKey[]
): Promise<Record<string, { change_1d?: number; change_7d?: number }>> {
  const change1dBySymbol = await getLiveChangePercent(items)
  const historyByHoldingId = await getLivePriceHistoryByHoldingId(items, '7D')
  const out: Record<string, { change_1d?: number; change_7d?: number }> = {}

  for (const item of items) {
    if (item.asset_type === 'cash') {
      out[item.id] = {}
      continue
    }

    const symbolKey = item.symbol.toUpperCase()
    const series = historyByHoldingId[item.id] ?? []
    let change7d: number | undefined
    if (series.length >= 2) {
      const first = series[0]?.price
      const last = series[series.length - 1]?.price
      if (first && last && Number.isFinite(first) && Number.isFinite(last) && first > 0) {
        change7d = ((last - first) / first) * 100
      }
    }

    out[item.id] = {
      change_1d: change1dBySymbol[symbolKey],
      change_7d: change7d,
    }
  }

  return out
}

async function getStockChangePercents(symbols: string[]): Promise<Record<string, number>> {
  const quotes = await getStockQuotes(symbols)
  const result: Record<string, number> = {}
  for (const symbol of normalizeStockSymbols(symbols)) {
    const quote = quotes[symbol]
    if (!quote) continue
    const pct = parseMaybeNumber(quote.percent_change) ?? parseMaybeNumber(quote.change_percent)
    if (pct != null && !Number.isNaN(pct)) result[symbol] = pct
  }
  return result
}

export async function searchStockSymbols(
  query: string,
  outputsize = 12
): Promise<Array<{ symbol: string; name: string }>> {
  const q = query.trim()
  if (q.length < 2) return []
  const data = await fetchTwelveDataJson<{ data?: TwelveDataSymbolSearchItem[] }>(
    '/symbol_search',
    {
      symbol: q,
      outputsize: String(Math.max(1, Math.min(30, outputsize))),
    },
    600
  )
  const rows = data?.data ?? []
  const out: Array<{ symbol: string; name: string }> = []
  for (const row of rows) {
    const symbol = row.symbol?.trim().toUpperCase()
    if (!symbol) continue
    const type = row.type?.trim().toUpperCase()
    if (type && type !== 'COMMON STOCK' && type !== 'ETF' && type !== 'DR') continue
    const name = row.instrument_name?.trim() || row.name?.trim() || symbol
    out.push({ symbol, name })
  }
  return out
}
