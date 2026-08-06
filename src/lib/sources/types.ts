import type { PerformanceRange } from '@/types'

export type SupportedChartRange = '7d' | '3m' | '1y'

export type TimePricePoint = {
  timestamp: number
  price: number
}

export type MajorPairConfig = {
  binance: string
  coinbase: string
}

export const RANGE_CONFIG: Record<
  Lowercase<PerformanceRange>,
  { durationMs: number; intervalMinutes: number; label: PerformanceRange }
> = {
  '7d': { durationMs: 7 * 24 * 60 * 60 * 1000, intervalMinutes: 120, label: '7D' },
  '3m': { durationMs: 90 * 24 * 60 * 60 * 1000, intervalMinutes: 3 * 24 * 60, label: '3M' },
  '1y': { durationMs: 365 * 24 * 60 * 60 * 1000, intervalMinutes: 14 * 24 * 60, label: '1Y' },
}
