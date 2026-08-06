import { calcHoldingPnL } from '@/lib/calculations'
import type { Holding } from '@/types'
import type { PriceKey } from '@/lib/prices'

function getPositiveNumberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

/** Skip per-asset market_chart when position value (USD) is below this — uses spot in portfolio series. */
export const CHART_HISTORY_MIN_USD = getPositiveNumberFromEnv('CHART_HISTORY_MIN_USD', 25)

export function filterKeysForHistoryFetch(
  keys: PriceKey[],
  pricedHoldings: Holding[],
  minUsd = CHART_HISTORY_MIN_USD
): PriceKey[] {
  if (minUsd <= 0) return keys.filter((k) => k.asset_type !== 'cash')
  const valueById = new Map<string, number>()
  for (const h of pricedHoldings) {
    valueById.set(h.id, calcHoldingPnL(h).value)
  }
  return keys.filter((k) => {
    if (k.asset_type === 'cash') return false
    const value = valueById.get(k.id) ?? 0
    return value >= minUsd
  })
}
