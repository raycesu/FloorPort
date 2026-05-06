import type { PerformanceRange } from '@/types'

export type SupportedChartRange = '24h' | '7d' | '1m' | '3m' | '1y'

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
  '24h': { durationMs: 24 * 60 * 60 * 1000, intervalMinutes: 15, label: '24H' },
  '7d': { durationMs: 7 * 24 * 60 * 60 * 1000, intervalMinutes: 120, label: '7D' },
  '1m': { durationMs: 30 * 24 * 60 * 60 * 1000, intervalMinutes: 24 * 60, label: '1M' },
  '3m': { durationMs: 90 * 24 * 60 * 60 * 1000, intervalMinutes: 24 * 60, label: '3M' },
  '1y': { durationMs: 365 * 24 * 60 * 60 * 1000, intervalMinutes: 7 * 24 * 60, label: '1Y' },
}
