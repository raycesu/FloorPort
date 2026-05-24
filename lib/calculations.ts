import { normalizeToBucketPoints } from '@/lib/sources/chartUtils'
import type { TimePricePoint } from '@/lib/sources/types'
import type { Holding, PortfolioSummary } from '@/types'

export function calcHoldingPnL(holding: Holding) {
  if (holding.asset_type === 'cash') {
    const value = holding.quantity * (holding.current_price ?? 0)
    return { value, pnl: 0, pnl_percent: 0 }
  }
  const cost = holding.quantity * holding.avg_buy_price
  const value = holding.quantity * (holding.current_price ?? 0)
  const pnl = value - cost
  const pnl_percent = cost > 0 ? (pnl / cost) * 100 : 0
  return { value, pnl, pnl_percent }
}

export function calcPortfolioSummary(holdings: Holding[]): PortfolioSummary {
  let total_value = 0
  let total_cost = 0
  let crypto_value = 0
  let stock_value = 0
  let cash_value = 0
  holdings.forEach((h) => {
    const { value } = calcHoldingPnL(h)
    total_value += value
    if (h.asset_type === 'cash') {
      total_cost += value
      cash_value += value
    } else {
      total_cost += h.quantity * h.avg_buy_price
      if (h.asset_type === 'crypto') crypto_value += value
      else stock_value += value
    }
  })
  const total_pnl = total_value - total_cost
  const total_pnl_percent = total_cost > 0 ? (total_pnl / total_cost) * 100 : 0
  return {
    total_value,
    total_cost,
    total_pnl,
    total_pnl_percent,
    crypto_value,
    stock_value,
    cash_value,
  }
}

export function enrichHoldingsWithPrices(
  holdings: Holding[],
  pricesByHoldingId: Record<string, number>
): Holding[] {
  return holdings.map((h) => {
    const current_price = pricesByHoldingId[h.id]
    const withPrice: Holding = { ...h, current_price }
    const { value, pnl, pnl_percent } = calcHoldingPnL(withPrice)
    return {
      ...withPrice,
      current_value: value,
      pnl,
      pnl_percent,
    }
  })
}

export function enrichHoldingsWithMarketChanges(
  holdings: Holding[],
  changesByHoldingId: Record<string, { change_1d?: number; change_7d?: number }>
): Holding[] {
  return holdings.map((h) => ({
    ...h,
    change_1d: changesByHoldingId[h.id]?.change_1d,
    change_7d: changesByHoldingId[h.id]?.change_7d,
  }))
}

/**
 * Merge holdings that represent the same asset (e.g. same symbol across wallets).
 * Used for portfolio-level views like allocation and combined holdings tables.
 */
export function combineHoldingsByAsset(holdings: Holding[]): Holding[] {
  const grouped = new Map<string, Holding[]>()
  for (const h of holdings) {
    const keyBase = h.coingecko_id?.trim() ? h.coingecko_id.trim().toLowerCase() : h.symbol.trim().toUpperCase()
    const key = `${h.asset_type}:${keyBase}`
    const rows = grouped.get(key)
    if (rows) rows.push(h)
    else grouped.set(key, [h])
  }

  return Array.from(grouped.entries()).map(([key, rows]) => {
    const sample = rows[0]
    const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0)
    const totalCost = rows.reduce((sum, r) => sum + r.quantity * r.avg_buy_price, 0)
    const weightedAvgBuy = totalQuantity > 0 ? totalCost / totalQuantity : 0
    const currentPrice = rows.find((r) => r.current_price != null)?.current_price
    const weightedCurrentValue = rows.reduce((sum, r) => sum + (r.current_value ?? 0), 0)
    const aggregateChange = (field: 'change_1d' | 'change_7d') => {
      const valid = rows.filter(
        (r) => typeof r[field] === 'number' && Number.isFinite(r[field]) && (r.current_value ?? 0) > 0
      )
      if (valid.length === 0) return undefined
      const totalWeight = valid.reduce((sum, r) => sum + (r.current_value ?? 0), 0)
      if (totalWeight <= 0) return undefined
      return valid.reduce((sum, r) => sum + (r[field] ?? 0) * (r.current_value ?? 0), 0) / totalWeight
    }

    const combined: Holding = {
      ...sample,
      id: `combined:${key}`,
      wallet_id: 'combined',
      quantity: totalQuantity,
      avg_buy_price: sample.asset_type === 'cash' ? sample.avg_buy_price : weightedAvgBuy,
      current_price: currentPrice,
      current_value: undefined,
      pnl: undefined,
      pnl_percent: undefined,
      change_1d: weightedCurrentValue > 0 ? aggregateChange('change_1d') : undefined,
      change_7d: weightedCurrentValue > 0 ? aggregateChange('change_7d') : undefined,
    }
    const { value, pnl, pnl_percent } = calcHoldingPnL(combined)
    return {
      ...combined,
      current_value: value,
      pnl,
      pnl_percent,
    }
  })
}

/** Sum live position value per wallet (USD; use display currency on the client). */
export function calcWalletValues(holdings: Holding[]): Record<string, number> {
  const byWallet: Record<string, number> = {}
  for (const h of holdings) {
    const { value } = calcHoldingPnL(h)
    byWallet[h.wallet_id] = (byWallet[h.wallet_id] ?? 0) + value
  }
  return byWallet
}

/** True when at least one non-cash holding has usable history (≥2 points). */
export function hasUsablePriceHistory(
  holdings: Holding[],
  priceHistoryByHoldingId: Record<string, TimePricePoint[]>
): boolean {
  return holdings.some((h) => {
    if (h.asset_type === 'cash') return false
    return (priceHistoryByHoldingId[h.id] ?? []).length >= 2
  })
}

/**
 * Chart is showable when we have a multi-point portfolio series with positive value.
 * Cash-heavy portfolios may have very small spread — that is still valid.
 */
function seriesHasPriceMovement(pts: TimePricePoint[]): boolean {
  if (pts.length < 2) return false
  const prices = pts.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0)
  if (prices.length < 2) return false
  const pmin = Math.min(...prices)
  const pmax = Math.max(...prices)
  return pmax > pmin * 1.001
}

export function isReliableChartSeries(
  series: { timestamp: number; value: number }[],
  holdings: Holding[],
  priceHistoryByHoldingId: Record<string, TimePricePoint[]>
): boolean {
  if (series.length < 2) return false
  const values = series.map((p) => p.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (!Number.isFinite(max) || max <= 0) return false

  const relativeSpread = (max - min) / max
  const summary = calcPortfolioSummary(holdings)
  const investedValue = summary.total_value - summary.cash_value
  const needsAssetHistory = investedValue > summary.total_value * 0.05

  const historyHasMovement = Object.values(priceHistoryByHoldingId).some(seriesHasPriceMovement)
  if (needsAssetHistory && !historyHasMovement) return false
  if (historyHasMovement && relativeSpread < 0.0005) return false
  if (relativeSpread < 0.0003) return false

  return true
}

function holdingSpotUsdPrice(h: Holding): number | null {
  if (h.current_price != null && Number.isFinite(h.current_price) && h.current_price > 0) {
    return h.current_price
  }
  return null
}

/**
 * Build portfolio value over time. Cash and assets without history use spot price (flat).
 * Assets with history use forward-filled bucket prices × quantity.
 */
export function calcPortfolioHistorySeries(
  holdings: Holding[],
  priceHistoryByHoldingId: Record<string, TimePricePoint[]>,
  bucketTimestamps?: number[],
  fiatUsdHistoryByCurrency?: Record<string, TimePricePoint[]>
): { timestamp: number; value: number }[] {
  const fromBuckets = bucketTimestamps?.filter((t) => Number.isFinite(t)) ?? []
  const fromHistory = new Set<number>()
  Object.values(priceHistoryByHoldingId).forEach((series) => {
    series.forEach((point) => fromHistory.add(point.timestamp))
  })
  const timestamps =
    fromBuckets.length > 0
      ? [...fromBuckets].sort((a, b) => a - b)
      : [...fromHistory].sort((a, b) => a - b)
  if (timestamps.length === 0) return []

  const out = timestamps.map((timestamp) => ({ timestamp, value: 0 }))

  for (const h of holdings) {
    const spotPrice = holdingSpotUsdPrice(h)
    const flatContribution = spotPrice != null ? h.quantity * spotPrice : 0

    if (h.asset_type === 'cash') {
      const sym = h.symbol.toUpperCase()
      const fiatSeries = fiatUsdHistoryByCurrency?.[sym]
      if (fiatSeries && fiatSeries.length >= 2) {
        const bucketed = normalizeToBucketPoints(fiatSeries, timestamps)
        for (let i = 0; i < out.length; i++) {
          const rate = bucketed[i]?.price ?? spotPrice
          if (rate != null && rate > 0) out[i].value += h.quantity * rate
        }
      } else if (flatContribution > 0) {
        out.forEach((p) => {
          p.value += flatContribution
        })
      }
      continue
    }

    const series = (priceHistoryByHoldingId[h.id] ?? [])
      .filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.price) && p.price > 0)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (series.length === 0) {
      if (flatContribution > 0) {
        out.forEach((p) => {
          p.value += flatContribution
        })
      }
      continue
    }

    const bucketed = normalizeToBucketPoints(series, timestamps)
    for (let i = 0; i < out.length; i++) {
      const price = bucketed[i]?.price ?? spotPrice
      if (price != null && price > 0) out[i].value += h.quantity * price
      else if (flatContribution > 0) out[i].value += flatContribution
    }
  }

  return out.filter((p) => p.value > 0)
}

/**
 * Scale series so the last point matches live portfolio total (fixes missing prices / partial history).
 */
export function alignPortfolioSeriesToCurrentTotal(
  series: { timestamp: number; value: number }[],
  holdings: Holding[]
): { timestamp: number; value: number }[] {
  if (series.length === 0) return series
  const target = calcPortfolioSummary(holdings).total_value
  if (target <= 0) return series
  const last = series[series.length - 1]?.value ?? 0
  if (last <= 0) return series
  const values = series.map((p) => p.value)
  const spread = Math.max(...values) - Math.min(...values)
  if (spread <= 0 || spread / Math.max(...values) < 0.0005) return series

  const ratio = target / last
  if (!Number.isFinite(ratio) || Math.abs(ratio - 1) < 0.02) return series
  return series.map((p) => ({ ...p, value: p.value * ratio }))
}
