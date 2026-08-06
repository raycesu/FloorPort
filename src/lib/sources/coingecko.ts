import { getOrCompute, type CacheFetchResult } from '@/lib/cache/sharedCache'
import {
  TTL_CHANGE_7D_SOFT_MS,
  TTL_CHANGE_7D_HARD_MS,
  TTL_QUOTE_SOFT_MS,
  TTL_QUOTE_HARD_MS,
  chartTtlForRange,
} from '@/lib/cache/ttl'
import { clampCoinGeckoDays, normalizeToBucketPoints } from '@/lib/sources/chartUtils'
import type { SupportedChartRange, TimePricePoint } from '@/lib/sources/types'
import { coingeckoGate } from '@/lib/sources/rateLimit'

export const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
}

const COINGECKO_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
const COINGECKO_LOG_THROTTLE_MS = 30 * 1000
const coinGeckoWarnState = new Map<string, number>()

function getPositiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export const DEFAULT_COINGECKO_RETRY_ATTEMPTS = getPositiveIntFromEnv('COINGECKO_RETRY_ATTEMPTS', 3)

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function warnCoinGeckoThrottled(key: string, message: string) {
  const now = Date.now()
  const prev = coinGeckoWarnState.get(key) ?? 0
  if (now - prev < COINGECKO_LOG_THROTTLE_MS) return
  coinGeckoWarnState.set(key, now)
  console.warn(message)
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null
  const sec = Number.parseInt(header, 10)
  if (Number.isFinite(sec) && sec > 0) return Math.min(sec * 1000, 60_000)
  return null
}

function computeCoinGeckoBackoffMs(attempt: number, retryAfterMs: number | null): number {
  if (retryAfterMs != null) return retryAfterMs
  const base = Math.min(400 * 2 ** attempt, 10_000)
  return base + Math.floor(Math.random() * 500)
}

export type CoinGeckoFetchResult<T> = {
  data: T | null
  status: number | null
  retries: number
}

export async function fetchCoinGeckoJson<T>(
  url: string,
  revalidateSeconds: number,
  context: string,
  maxAttempts = DEFAULT_COINGECKO_RETRY_ATTEMPTS
): Promise<CoinGeckoFetchResult<T>> {
  return coingeckoGate.run(async () => {
    let attempt = 0
    while (attempt < Math.max(1, maxAttempts)) {
      try {
        const res = await fetch(url, { next: { revalidate: revalidateSeconds } })
        if (res.ok) {
          const data = (await res.json().catch(() => null)) as T | null
          if (data == null) {
            warnCoinGeckoThrottled(`${context}:invalid-json`, `CoinGecko invalid JSON for ${context}`)
            return { data: null, status: res.status, retries: attempt }
          }
          return { data, status: res.status, retries: attempt }
        }

        const status = res.status
        const retryAfterMs = parseRetryAfterMs(res.headers.get('Retry-After'))
        const retryable = COINGECKO_RETRYABLE_STATUSES.has(status)

        if (!retryable || attempt >= Math.max(1, maxAttempts) - 1) {
          warnCoinGeckoThrottled(
            `${context}:status:${status}`,
            `CoinGecko request failed for ${context}: status=${status}, retries=${attempt}`
          )
          return { data: null, status, retries: attempt }
        }

        await sleep(computeCoinGeckoBackoffMs(attempt, retryAfterMs))
        attempt += 1
      } catch (error) {
        if (attempt >= Math.max(1, maxAttempts) - 1) {
          warnCoinGeckoThrottled(
            `${context}:network`,
            `CoinGecko network failure for ${context} after ${attempt} retries`
          )
          console.warn(error)
          return { data: null, status: null, retries: attempt }
        }
        await sleep(computeCoinGeckoBackoffMs(attempt, null))
        attempt += 1
      }
    }
    return { data: null, status: null, retries: Math.max(0, maxAttempts - 1) }
  })
}

export function getCoinGeckoId(symbol: string): string | undefined {
  return COINGECKO_IDS[symbol.toUpperCase()]
}

const stableIdsKey = (ids: string[]) => [...new Set(ids.filter(Boolean))].sort().join(',')

export async function getCachedSimplePricesByCoingeckoIds(ids: string[]): Promise<Record<string, number>> {
  const keyList = stableIdsKey(ids)
  if (!keyList) return {}
  const cacheKey = `cg:simple_price:${keyList}`
  const { value } = await getOrCompute({
    key: cacheKey,
    softTtlMs: TTL_QUOTE_SOFT_MS,
    hardTtlMs: TTL_QUOTE_HARD_MS,
    source: 'coingecko',
    fetcher: async () => {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(keyList)}&vs_currencies=usd`
      const request = await fetchCoinGeckoJson<Record<string, { usd?: number }>>(url, 60, `simple_price(ids)`)
      return { value: request.data ?? {}, status: request.status }
    },
  })
  const data = value as Record<string, { usd?: number }>
  const result: Record<string, number> = {}
  for (const id of keyList.split(',')) {
    if (data[id]?.usd != null) result[id] = data[id].usd!
  }
  return result
}

export type CgQuote24h = { price: number; change_24h?: number }

export async function getCachedQuotes24hByCoingeckoIds(
  idBySymbol: Map<string, string>
): Promise<Record<string, CgQuote24h>> {
  const ids = [...new Set(idBySymbol.values())].filter(Boolean).sort()
  if (ids.length === 0) return {}
  const cacheKey = `cg:simple_quotes24:${ids.join(',')}`
  const { value } = await getOrCompute({
    key: cacheKey,
    softTtlMs: TTL_QUOTE_SOFT_MS,
    hardTtlMs: TTL_QUOTE_HARD_MS,
    source: 'coingecko',
    fetcher: async () => {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=usd&include_24hr_change=true`
      const request =
        await fetchCoinGeckoJson<Record<string, { usd?: number; usd_24h_change?: number }>>(url, 60, `simple_quotes24`)
      return { value: request.data ?? {}, status: request.status }
    },
  })
  const data = value as Record<string, { usd?: number; usd_24h_change?: number }>
  const result: Record<string, CgQuote24h> = {}
  idBySymbol.forEach((cgId, symbol) => {
    const row = data[cgId]
    if (row?.usd != null) {
      result[symbol.toUpperCase()] = { price: row.usd, change_24h: row.usd_24h_change }
    }
  })
  return result
}

/** Batched 7d % change via /coins/markets (one call per chunk). */
export async function getCached7dChangeByCoingeckoIds(ids: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return {}
  const chunkSize = 120
  const out: Record<string, number> = {}

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const keyList = chunk.sort().join(',')
    const cacheKey = `cg:markets_7d:${keyList}`
    const { value } = await getOrCompute({
      key: cacheKey,
      softTtlMs: TTL_CHANGE_7D_SOFT_MS,
      hardTtlMs: TTL_CHANGE_7D_HARD_MS,
      source: 'coingecko',
      fetcher: async () => {
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(keyList)}&price_change_percentage=7d&per_page=250&page=1&sparkline=false`
        const request = await fetchCoinGeckoJson<
          Array<{
            id?: string
            price_change_percentage_7d?: number
            price_change_percentage_7d_in_currency?: number
          }>
        >(url, 120, `coins_markets_7d(${chunk.length})`)
        return { value: request.data ?? [], status: request.status }
      },
    })
        const rows = value as Array<{
      id?: string
      price_change_percentage_7d?: number
      price_change_percentage_7d_in_currency?: number
    }>
    for (const row of rows) {
      const id = row.id
      if (!id) continue
      const pct =
        row.price_change_percentage_7d ??
        row.price_change_percentage_7d_in_currency
      if (pct != null && Number.isFinite(pct)) out[id] = pct
    }
  }
  return out
}

export async function getCachedMarketChartSeries(
  coingeckoId: string,
  range: SupportedChartRange,
  bucketTimestamps: number[],
  maxAttempts = DEFAULT_COINGECKO_RETRY_ATTEMPTS
): Promise<CacheFetchResult<TimePricePoint[]>> {
  const days = clampCoinGeckoDays(range)
  const { soft, hard } = chartTtlForRange(range)
  const cacheKey = `cg:market_chart:${coingeckoId}:${range}:${days}`

  const result = await getOrCompute({
    key: cacheKey,
    softTtlMs: soft,
    hardTtlMs: hard,
    source: 'coingecko',
    shouldPersist: (value) => Array.isArray(value) && value.length >= 2,
    fetcher: async () => {
      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coingeckoId)}/market_chart?vs_currency=usd&days=${days}`
      const response = await fetchCoinGeckoJson<{ prices?: [number, number][] }>(
        url,
        60,
        `market_chart(${coingeckoId},${range})`,
        maxAttempts
      )
      const data = response.data
      if (!data) return { value: [] as TimePricePoint[], status: response.status }
      const raw: TimePricePoint[] =
        data.prices
          ?.map(([timestamp, price]) => ({ timestamp, price }))
          .filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.price) && p.price > 0) ?? []
      return { value: raw, status: response.status }
    },
  })
  const points =
    result.value.length >= 2 ? normalizeToBucketPoints(result.value, bucketTimestamps) : []
  return { ...result, value: points }
}
