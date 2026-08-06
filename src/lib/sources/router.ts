import { fetchBinance24hrBatch, fetchBinanceKlinesSeries, parseBinanceTicker } from '@/lib/sources/binance'
import { fetchCoinbaseCandlesSeries, fetchCoinbaseTicker } from '@/lib/sources/coinbase'
import {
  DEFAULT_COINGECKO_RETRY_ATTEMPTS,
  getCached7dChangeByCoingeckoIds,
  getCachedQuotes24hByCoingeckoIds,
  getCachedSimplePricesByCoingeckoIds,
  getCachedMarketChartSeries,
  getCoinGeckoId,
  type CgQuote24h,
} from '@/lib/sources/coingecko'
import { isMajorCoingeckoId, MAJOR_COINGECKO_PAIRS } from '@/lib/sources/majorPairs'
import type { SupportedChartRange, TimePricePoint } from '@/lib/sources/types'

export type SourceQuote24h = { price: number; change_24h?: number }

type HoldingLike = {
  asset_type: string
  symbol: string
  coingecko_id?: string | null
}

export async function getCryptoSpotPricesByCoingeckoIds(ids: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return {}
  const majors: string[] = []
  const rest: string[] = []
  for (const id of unique) {
    if (isMajorCoingeckoId(id)) majors.push(id)
    else rest.push(id)
  }
  const [majorMap, restMap] = await Promise.all([
    fetchMajorSpotPrices(majors),
    rest.length ? getCachedSimplePricesByCoingeckoIds(rest) : Promise.resolve({}),
  ])
  return { ...restMap, ...majorMap }
}

async function fetchMajorSpotPrices(majorIds: string[]): Promise<Record<string, number>> {
  if (majorIds.length === 0) return {}
  const symbols = [...new Set(majorIds.map((id) => MAJOR_COINGECKO_PAIRS[id].binance))]
  const tickers = await fetchBinance24hrBatch(symbols)
  const out: Record<string, number> = {}
  for (const id of majorIds) {
    const sym = MAJOR_COINGECKO_PAIRS[id].binance
    const parsed = parseBinanceTicker(tickers[sym])
    if (parsed) {
      out[id] = parsed.price
      continue
    }
    const cb = await fetchCoinbaseTicker(MAJOR_COINGECKO_PAIRS[id].coinbase)
    if (cb) out[id] = cb.price
  }
  return out
}

export async function getCrypto24hQuotesBySymbol(idBySymbol: Map<string, string>): Promise<Record<string, SourceQuote24h>> {
  const restMap = new Map<string, string>()
  const majorEntries: { symbol: string; cgId: string }[] = []

  idBySymbol.forEach((cgId, sym) => {
    const upper = sym.toUpperCase()
    if (isMajorCoingeckoId(cgId)) majorEntries.push({ symbol: upper, cgId })
    else restMap.set(upper, cgId)
  })

  const out: Record<string, SourceQuote24h> = {}

  if (majorEntries.length) {
    const symbols = [...new Set(majorEntries.map((e) => MAJOR_COINGECKO_PAIRS[e.cgId].binance))]
    const tickers = await fetchBinance24hrBatch(symbols)
    for (const { symbol, cgId } of majorEntries) {
      const bsym = MAJOR_COINGECKO_PAIRS[cgId].binance
      let parsed = parseBinanceTicker(tickers[bsym])
      if (!parsed) {
        const cb = await fetchCoinbaseTicker(MAJOR_COINGECKO_PAIRS[cgId].coinbase)
        if (cb) parsed = { price: cb.price, change24h: undefined }
      }
      if (parsed) out[symbol] = { price: parsed.price, change_24h: parsed.change24h }
    }
  }

  if (restMap.size) {
    const cgQ = await getCachedQuotes24hByCoingeckoIds(restMap)
    for (const [sym, q] of Object.entries(cgQ)) {
      out[sym] = { price: q.price, change_24h: q.change_24h }
    }
  }

  return out
}

export async function getCryptoHistorySeriesWithMeta(
  coingeckoId: string,
  range: SupportedChartRange,
  bucketTimestamps: number[],
  preferFastFail?: boolean
): Promise<{ points: TimePricePoint[]; fetchedAt: number; isStale: boolean }> {
  const maxAttempts = preferFastFail
    ? 1
    : range === '7d'
      ? DEFAULT_COINGECKO_RETRY_ATTEMPTS
      : Math.min(2, DEFAULT_COINGECKO_RETRY_ATTEMPTS)
  if (isMajorCoingeckoId(coingeckoId)) {
    const pair = MAJOR_COINGECKO_PAIRS[coingeckoId]
    const bn = await fetchBinanceKlinesSeries(pair.binance, range, bucketTimestamps)
    if (bn.value.length >= 2) return { points: bn.value, fetchedAt: bn.fetchedAt, isStale: bn.isStale }
    const cb = await fetchCoinbaseCandlesSeries(pair.coinbase, range, bucketTimestamps)
    if (cb.value.length >= 2) return { points: cb.value, fetchedAt: cb.fetchedAt, isStale: cb.isStale }
  }
  const cgR = await getCachedMarketChartSeries(coingeckoId, range, bucketTimestamps, maxAttempts)
  return { points: cgR.value, fetchedAt: cgR.fetchedAt, isStale: cgR.isStale }
}

export async function getLive7dChangePercentBySymbol(items: HoldingLike[]): Promise<Record<string, number>> {
  const ids: string[] = []
  const symbolToCgId = new Map<string, string>()
  for (const h of items) {
    if (h.asset_type !== 'crypto') continue
    const cg = h.coingecko_id?.trim()
    if (cg) {
      ids.push(cg)
      symbolToCgId.set(h.symbol.toUpperCase(), cg)
      continue
    }
    const leg = getCoinGeckoId(h.symbol)
    if (leg) {
      ids.push(leg)
      symbolToCgId.set(h.symbol.toUpperCase(), leg)
    }
  }
  const byId = await getCached7dChangeByCoingeckoIds(ids)
  const out: Record<string, number> = {}
  symbolToCgId.forEach((id, sym) => {
    const v = byId[id]
    if (v != null && Number.isFinite(v)) out[sym] = v
  })
  return out
}

export type { CgQuote24h }
