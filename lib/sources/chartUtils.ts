import type { PerformanceRange } from '@/types'
import { RANGE_CONFIG, type SupportedChartRange, type TimePricePoint } from '@/lib/sources/types'

export const toSupportedRangeKey = (range: PerformanceRange | string): SupportedChartRange => {
  const normalized = String(range).trim().toLowerCase() as SupportedChartRange
  return normalized in RANGE_CONFIG ? normalized : '24h'
}

export function clampCoinGeckoDays(range: SupportedChartRange): number {
  if (range === '24h') return 1
  if (range === '7d') return 7
  if (range === '1m') return 30
  if (range === '3m') return 90
  return 365
}

export function normalizeToBucketPoints(points: TimePricePoint[], bucketTimestamps: number[]): TimePricePoint[] {
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

export function makeBucketTimestamps(durationMs: number, intervalMinutes: number): number[] {
  const now = Date.now()
  const intervalMs = intervalMinutes * 60 * 1000
  const alignedNow = Math.floor(now / intervalMs) * intervalMs
  const start = alignedNow - durationMs
  const out: number[] = []
  for (let t = start; t <= alignedNow; t += intervalMs) out.push(t)
  return out
}

export function mapRangeToBinanceKline(range: SupportedChartRange): { interval: string; limit: number } {
  if (range === '24h') return { interval: '15m', limit: 96 }
  if (range === '7d') return { interval: '2h', limit: 84 }
  if (range === '1m') return { interval: '1d', limit: 32 }
  if (range === '3m') return { interval: '1d', limit: 92 }
  return { interval: '1w', limit: 54 }
}

export function mapRangeToCoinbaseGranularity(range: SupportedChartRange): { granularity: number; limit: number } {
  if (range === '24h') return { granularity: 900, limit: 96 }
  if (range === '7d') return { granularity: 7200, limit: 84 }
  if (range === '1m') return { granularity: 86400, limit: 32 }
  if (range === '3m') return { granularity: 86400, limit: 92 }
  return { granularity: 604800, limit: 54 }
}
