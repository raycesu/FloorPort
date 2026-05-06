import { getFiatUsdRates } from '@/lib/fx'
import { RANGE_CONFIG, type SupportedChartRange, type TimePricePoint } from '@/lib/sources/types'
import {
  makeBucketTimestamps,
  toSupportedRangeKey,
} from '@/lib/sources/chartUtils'
import {
  COINGECKO_IDS,
  getCoinGeckoId,
  getCachedQuotes24hByCoingeckoIds,
} from '@/lib/sources/coingecko'
import {
  getCrypto24hQuotesBySymbol,
  getCryptoHistorySeriesWithMeta,
  getCryptoSpotPricesByCoingeckoIds,
  getLive7dChangePercentBySymbol,
  type SourceQuote24h,
} from '@/lib/sources/router'

export { getLive7dChangePercentBySymbol }
import type { PerformanceRange } from '@/types'

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com'
const TWELVE_DATA_QUOTE_CACHE_TTL_MS = 60 * 1000
const TWELVE_DATA_HISTORY_CACHE_TTL_MS = 3 * 60 * 1000
const TWELVE_DATA_CACHE_MAX_ENTRIES = 350

type CacheEntry<T> = {
  expiresAt: number
  value: T
}

const twelveDataMemoryCache = new Map<string, CacheEntry<unknown>>()
const twelveDataInFlight = new Map<string, Promise<unknown>>()

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function getPositiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const COINGECKO_HISTORY_CONCURRENCY = getPositiveIntFromEnv('COINGECKO_HISTORY_CONCURRENCY', 2)

function touchTwelveDataCacheLimit() {
  while (twelveDataMemoryCache.size > TWELVE_DATA_CACHE_MAX_ENTRIES) {
    const first = twelveDataMemoryCache.keys().next().value
    if (first === undefined) break
    twelveDataMemoryCache.delete(first)
  }
}

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

async function withTwelveDataCache<T>(key: string, ttlMs: number, producer: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const cached = twelveDataMemoryCache.get(key)
  if (cached && cached.expiresAt > now) return cached.value as T

  const active = twelveDataInFlight.get(key)
  if (active) return active as Promise<T>

  const next = producer()
    .then((value) => {
      twelveDataMemoryCache.set(key, { value, expiresAt: Date.now() + ttlMs })
      touchTwelveDataCacheLimit()
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
  revalidateSeconds: number,
  attempt = 0
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
      const is429 = res.status === 429 || err?.code === 429
      if (is429 && attempt === 0) {
        const retryAfter = res.headers.get('Retry-After')
        const sec = retryAfter ? parseInt(retryAfter, 10) : NaN
        const waitMs = Number.isFinite(sec)
          ? Math.min(Math.max(sec, 1) * 1000, 60_000)
          : 500 + Math.random() * 1000
        await sleep(waitMs)
        return fetchTwelveDataJson<T>(endpoint, params, revalidateSeconds, 1)
      }
      if (is429) console.warn(`Twelve Data rate limit hit for ${endpoint}`)
      else console.warn(`Twelve Data request failed for ${endpoint}: ${res.status} ${res.statusText}`)
      return null
    }

    const err = parseTwelveDataError(data)
    if (err?.code) {
      if (err.code === 429 && attempt === 0) {
        await sleep(500 + Math.random() * 1000)
        return fetchTwelveDataJson<T>(endpoint, params, revalidateSeconds, 1)
      }
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

export { getCoinGeckoId, COINGECKO_IDS }

export async function getCryptoPricesByCoingeckoIds(ids: string[]): Promise<Record<string, number>> {
  return getCryptoSpotPricesByCoingeckoIds(ids)
}

export async function getCryptoPrices(symbols: string[]): Promise<Record<string, number>> {
  const upper = symbols.map((s) => s.toUpperCase())
  const ids = upper.map((s) => COINGECKO_IDS[s]).filter(Boolean) as string[]
  if (ids.length === 0) return {}
  const prices = await getCryptoSpotPricesByCoingeckoIds(ids)
  const result: Record<string, number> = {}
  upper.forEach((symbol) => {
    const id = COINGECKO_IDS[symbol]
    if (id && prices[id] != null) result[symbol] = prices[id]!
  })
  return result
}

export type CryptoQuote = { price: number; change_24h?: number }

export async function getCryptoQuotes(symbols: string[]): Promise<Record<string, CryptoQuote>> {
  const upper = symbols.map((s) => s.toUpperCase())
  const m = new Map<string, string>()
  for (const sym of upper) {
    const id = COINGECKO_IDS[sym]
    if (id) m.set(sym, id)
  }
  if (m.size === 0) return {}
  return getCachedQuotes24hByCoingeckoIds(m)
}

export async function getCryptoQuotesByCoingeckoIds(
  idBySymbol: Map<string, string>
): Promise<Record<string, CryptoQuote>> {
  return getCrypto24hQuotesBySymbol(idBySymbol)
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

export { type TimePricePoint }

export type HistoryFetchMeta = {
  fetchedAt: number
  isStale: boolean
}

function mergeHistoryMeta(parts: HistoryFetchMeta[]): HistoryFetchMeta {
  if (parts.length === 0) return { fetchedAt: Date.now(), isStale: false }
  return {
    fetchedAt: Math.min(...parts.map((p) => p.fetchedAt)),
    isStale: parts.some((p) => p.isStale),
  }
}

function mapRangeToStockRequest(range: SupportedChartRange): {
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

export function toRangeKey(range: PerformanceRange | string): SupportedChartRange {
  return toSupportedRangeKey(range)
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
      ? getCryptoSpotPricesByCoingeckoIds(coingeckoIds)
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

  const [routerQuotes, legacyQuotes, stockChanges] = await Promise.all([
    idBySymbol.size ? getCrypto24hQuotesBySymbol(idBySymbol) : Promise.resolve({}),
    legacyCryptoSymbols.length ? getCryptoQuotes([...new Set(legacyCryptoSymbols)]) : Promise.resolve({}),
    stockSymbols.length ? getStockChangePercents([...new Set(stockSymbols)]) : Promise.resolve({}),
  ])

  const out: Record<string, number> = { ...stockChanges }
  for (const [sym, q] of Object.entries(routerQuotes) as [string, SourceQuote24h][]) {
    if (q.change_24h != null && !Number.isNaN(q.change_24h)) out[sym] = q.change_24h
  }
  ;(Object.entries(legacyQuotes) as [string, CryptoQuote][]).forEach(([sym, q]) => {
    if (q.change_24h != null && !Number.isNaN(q.change_24h)) out[sym] = q.change_24h
  })
  return out
}

function normalizeToBucketPoints(points: TimePricePoint[], bucketTimestamps: number[]): TimePricePoint[] {
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

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return []
  const results: R[] = new Array(items.length)
  let nextSlot = 0

  const worker = async () => {
    while (true) {
      const slot = nextSlot
      nextSlot += 1
      if (slot >= items.length) break
      results[slot] = await fn(items[slot])
    }
  }

  const n = Math.min(Math.max(1, limit), items.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}

async function getCryptoHistoryByCoingeckoIdsWithMeta(
  ids: string[],
  bucketTimestamps: number[],
  range: SupportedChartRange,
  preferFastFail?: boolean
): Promise<{ series: Record<string, TimePricePoint[]>; meta: HistoryFetchMeta }> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) {
    return { series: {}, meta: { fetchedAt: Date.now(), isStale: false } }
  }
  const rows = await mapWithConcurrency(unique, COINGECKO_HISTORY_CONCURRENCY, async (id) => {
    const r = await getCryptoHistorySeriesWithMeta(id, range, bucketTimestamps, preferFastFail)
    return { id, points: r.points, fetchedAt: r.fetchedAt, isStale: r.isStale }
  })
  const series: Record<string, TimePricePoint[]> = {}
  const metas: HistoryFetchMeta[] = []
  for (const row of rows) {
    series[row.id] = row.points
    metas.push({ fetchedAt: row.fetchedAt, isStale: row.isStale })
  }
  return { series, meta: mergeHistoryMeta(metas) }
}

async function getStockHistoryByRange(
  symbols: string[],
  bucketTimestamps: number[],
  range: SupportedChartRange
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

type PriceHistoryOptions = {
  preferFastFail?: boolean
}

export async function getLivePriceHistoryByHoldingId(
  items: PriceKey[],
  range: PerformanceRange | string,
  options?: PriceHistoryOptions
): Promise<Record<string, TimePricePoint[]>> {
  const { history } = await getLivePriceHistoryByHoldingIdWithMeta(items, range, options)
  return history
}

export async function getLivePriceHistoryByHoldingIdWithMeta(
  items: PriceKey[],
  range: PerformanceRange | string,
  options?: PriceHistoryOptions
): Promise<{ history: Record<string, TimePricePoint[]>; meta: HistoryFetchMeta }> {
  const rangeKey = toSupportedRangeKey(range)
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

  const [cgResult, legacyResult, stockSeries] = await Promise.all([
    getCryptoHistoryByCoingeckoIdsWithMeta(
      [...cryptoByCoingecko.keys()],
      buckets,
      rangeKey,
      options?.preferFastFail
    ),
    getCryptoHistoryByCoingeckoIdsWithMeta(
      [...new Set(legacyCryptoSymbols)]
        .map((symbol) => getCoinGeckoId(symbol))
        .filter((id): id is string => Boolean(id)),
      buckets,
      rangeKey,
      options?.preferFastFail
    ),
    getStockHistoryByRange(stockSymbols, buckets, rangeKey),
  ])

  const metas: HistoryFetchMeta[] = [cgResult.meta, legacyResult.meta]

  const out: Record<string, TimePricePoint[]> = {}
  for (const h of items) {
    if (h.asset_type === 'cash') continue
    if (h.asset_type === 'stock') {
      out[h.id] = stockSeries[h.symbol.toUpperCase()] ?? []
      continue
    }
    const cg = h.coingecko_id?.trim()
    if (cg) {
      out[h.id] = cgResult.series[cg] ?? []
      continue
    }
    const legacyId = getCoinGeckoId(h.symbol)
    out[h.id] = legacyId ? legacyResult.series[legacyId] ?? [] : []
  }

  return { history: out, meta: mergeHistoryMeta(metas) }
}

/** 24h normalized price series per holding id, preserved for backwards compatibility. */
export async function getLivePriceHistory24hByHoldingId(items: PriceKey[]): Promise<Record<string, TimePricePoint[]>> {
  return getLivePriceHistoryByHoldingId(items, '24H')
}

export async function getHoldingChangePercents(
  items: PriceKey[]
): Promise<Record<string, { change_1d?: number; change_7d?: number }>> {
  const change1dBySymbol = await getLiveChangePercent(items)
  const change7dBySymbol = await getLive7dChangePercentBySymbol(items)
  const stockKeys = items.filter((h) => h.asset_type === 'stock')
  const stock7dHistory =
    stockKeys.length > 0
      ? await getLivePriceHistoryByHoldingId(
          stockKeys.map((h) => ({ id: h.id, symbol: h.symbol, asset_type: h.asset_type, coingecko_id: h.coingecko_id })),
          '7D',
          { preferFastFail: true }
        )
      : {}
  return mergeHoldingChangePercents(items, change1dBySymbol, change7dBySymbol, stock7dHistory)
}

export function mergeHoldingChangePercents(
  items: PriceKey[],
  change1dBySymbol: Record<string, number>,
  change7dBySymbol: Record<string, number>,
  stock7dHistoryByHoldingId?: Record<string, TimePricePoint[]>
): Record<string, { change_1d?: number; change_7d?: number }> {
  const out: Record<string, { change_1d?: number; change_7d?: number }> = {}

  for (const item of items) {
    if (item.asset_type === 'cash') {
      out[item.id] = {}
      continue
    }

    const symbolKey = item.symbol.toUpperCase()

    if (item.asset_type === 'stock') {
      const series = stock7dHistoryByHoldingId?.[item.id] ?? []
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
      continue
    }

    out[item.id] = {
      change_1d: change1dBySymbol[symbolKey],
      change_7d: change7dBySymbol[symbolKey],
    }
  }

  return out
}

export function getHoldingChangePercentsFromHistory(
  items: PriceKey[],
  change1dBySymbol: Record<string, number>,
  historyByHoldingId: Record<string, TimePricePoint[]>
): Record<string, { change_1d?: number; change_7d?: number }> {
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
