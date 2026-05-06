import { getOrCompute, type CacheFetchResult } from '@/lib/cache/sharedCache'
import { TTL_QUOTE_SOFT_MS, TTL_QUOTE_HARD_MS, chartTtlForRange } from '@/lib/cache/ttl'
import { mapRangeToBinanceKline, normalizeToBucketPoints } from '@/lib/sources/chartUtils'
import type { SupportedChartRange, TimePricePoint } from '@/lib/sources/types'
import { binanceGate } from '@/lib/sources/rateLimit'

const BINANCE_BASE = 'https://api.binance.com'

type Ticker24hr = {
  symbol?: string
  lastPrice?: string
  priceChangePercent?: string
}

type KlineRow = [number, string, string, string, string, string, number, string, number, string, string, string]

export async function fetchBinance24hrBatch(symbols: string[]): Promise<Record<string, Ticker24hr>> {
  if (symbols.length === 0) return {}
  const cacheKey = `bn:ticker24:${symbols.slice().sort().join(',')}`
  const { value } = await getOrCompute({
    key: cacheKey,
    softTtlMs: TTL_QUOTE_SOFT_MS,
    hardTtlMs: TTL_QUOTE_HARD_MS,
    source: 'binance',
    fetcher: async () => {
      const payload = JSON.stringify(symbols)
      const url = `${BINANCE_BASE}/api/v3/ticker/24hr?symbols=${encodeURIComponent(payload)}`
      const res = await binanceGate.run(async () => fetch(url, { next: { revalidate: 30 } }))
      const status = res.status
      if (!res.ok) {
        return { value: [] as Ticker24hr[], status }
      }
      const data = (await res.json().catch(() => null)) as Ticker24hr[] | null
      return { value: Array.isArray(data) ? data : [], status }
    },
  })
  const rows = value as Ticker24hr[]
  const out: Record<string, Ticker24hr> = {}
  for (const row of rows) {
    const sym = row.symbol?.toUpperCase()
    if (sym) out[sym] = row
  }
  return out
}

export async function fetchBinanceKlinesSeries(
  symbol: string,
  range: SupportedChartRange,
  bucketTimestamps: number[]
): Promise<CacheFetchResult<TimePricePoint[]>> {
  const { interval, limit } = mapRangeToBinanceKline(range)
  const { soft, hard } = chartTtlForRange(range)
  const sym = symbol.toUpperCase()
  const cacheKey = `bn:klines:${sym}:${range}:${interval}:${limit}`

  return getOrCompute({
    key: cacheKey,
    softTtlMs: soft,
    hardTtlMs: hard,
    source: 'binance',
    fetcher: async () => {
      const url = `${BINANCE_BASE}/api/v3/klines?symbol=${encodeURIComponent(sym)}&interval=${interval}&limit=${limit}`
      const res = await binanceGate.run(async () => fetch(url, { next: { revalidate: 120 } }))
      if (!res.ok) return { value: [] as TimePricePoint[], status: res.status }
      const data = (await res.json().catch(() => null)) as KlineRow[] | null
      if (!Array.isArray(data)) return { value: [], status: res.status }
      const raw: TimePricePoint[] = []
      for (const row of data) {
        const closeTime = row[6]
        const close = row[4]
        const t = typeof closeTime === 'number' ? closeTime : Number(closeTime)
        const p = Number.parseFloat(String(close))
        if (Number.isFinite(t) && Number.isFinite(p) && p > 0) raw.push({ timestamp: t, price: p })
      }
      const points = normalizeToBucketPoints(raw, bucketTimestamps)
      return { value: points, status: res.status }
    },
  })
}

export function parseBinanceTicker(t: Ticker24hr | undefined): { price: number; change24h?: number } | null {
  if (!t?.lastPrice) return null
  const price = Number.parseFloat(t.lastPrice)
  if (!Number.isFinite(price) || price <= 0) return null
  const pctRaw = t.priceChangePercent != null ? Number.parseFloat(t.priceChangePercent) : NaN
  const change24h = Number.isFinite(pctRaw) ? pctRaw : undefined
  return { price, change24h }
}
