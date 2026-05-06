import { getOrCompute, type CacheFetchResult } from '@/lib/cache/sharedCache'
import { chartTtlForRange } from '@/lib/cache/ttl'
import { mapRangeToCoinbaseGranularity, normalizeToBucketPoints } from '@/lib/sources/chartUtils'
import type { SupportedChartRange, TimePricePoint } from '@/lib/sources/types'
import { coinbaseGate } from '@/lib/sources/rateLimit'

const COINBASE_BASE = 'https://api.exchange.coinbase.com'

/** Coinbase candles: [ time, low, high, open, close, volume ] */
type CoinbaseCandle = [number, string, string, string, string, string]

export async function fetchCoinbaseCandlesSeries(
  productId: string,
  range: SupportedChartRange,
  bucketTimestamps: number[]
): Promise<CacheFetchResult<TimePricePoint[]>> {
  const { granularity, limit } = mapRangeToCoinbaseGranularity(range)
  const { soft, hard } = chartTtlForRange(range)
  const pid = productId.toUpperCase()
  const cacheKey = `cb:candles:${pid}:${range}:${granularity}:${limit}`

  return getOrCompute({
    key: cacheKey,
    softTtlMs: soft,
    hardTtlMs: hard,
    source: 'coinbase',
    fetcher: async () => {
      const url = `${COINBASE_BASE}/products/${encodeURIComponent(pid)}/candles?granularity=${granularity}`
      const res = await coinbaseGate.run(async () => fetch(url, { next: { revalidate: 120 } }))
      if (!res.ok) return { value: [] as TimePricePoint[], status: res.status }
      const data = (await res.json().catch(() => null)) as CoinbaseCandle[] | null
      if (!Array.isArray(data)) return { value: [], status: res.status }
      const sliced = data.slice(-limit)
      const raw: TimePricePoint[] = []
      for (const row of sliced) {
        const t = (row[0] as number) * 1000
        const close = Number.parseFloat(row[4])
        if (Number.isFinite(t) && Number.isFinite(close) && close > 0) raw.push({ timestamp: t, price: close })
      }
      raw.sort((a, b) => a.timestamp - b.timestamp)
      const points = normalizeToBucketPoints(raw, bucketTimestamps)
      return { value: points, status: res.status }
    },
  })
}

export async function fetchCoinbaseTicker(productId: string): Promise<{ price: number } | null> {
  const pid = productId.toUpperCase()
  const cacheKey = `cb:ticker:${pid}`
  const { value } = await getOrCompute({
    key: cacheKey,
    softTtlMs: 60_000,
    hardTtlMs: 6 * 60 * 60 * 1000,
    source: 'coinbase',
    fetcher: async () => {
      const url = `${COINBASE_BASE}/products/${encodeURIComponent(pid)}/ticker`
      const res = await coinbaseGate.run(async () => fetch(url, { next: { revalidate: 30 } }))
      if (!res.ok) return { value: null as { price: string } | null, status: res.status }
      const data = (await res.json().catch(() => null)) as { price?: string } | null
      return { value: data, status: res.status }
    },
  })
  const data = value as { price?: string } | null
  if (!data?.price) return null
  const price = Number.parseFloat(data.price)
  if (!Number.isFinite(price) || price <= 0) return null
  return { price }
}
