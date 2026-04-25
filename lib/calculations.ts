import type { Holding, PortfolioSummary } from '@/types'
import type { TimePricePoint } from '@/lib/prices'

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

/**
 * Build a portfolio value series from per-holding price history.
 * Falls back to current_price when history is unavailable.
 */
export function calcPortfolioHistorySeries24h(
  holdings: Holding[],
  priceHistoryByHoldingId: Record<string, TimePricePoint[]>
): { timestamp: number; value: number }[] {
  return calcPortfolioHistorySeries(holdings, priceHistoryByHoldingId)
}

export function calcPortfolioHistorySeries(
  holdings: Holding[],
  priceHistoryByHoldingId: Record<string, TimePricePoint[]>
): { timestamp: number; value: number }[] {
  const allTimestamps = new Set<number>()
  Object.values(priceHistoryByHoldingId).forEach((series) => {
    series.forEach((point) => allTimestamps.add(point.timestamp))
  })
  const timestamps = [...allTimestamps].sort((a, b) => a - b)
  if (timestamps.length === 0) return []

  const out = timestamps.map((timestamp) => ({ timestamp, value: 0 }))
  for (const h of holdings) {
    if (h.asset_type === 'cash') {
      const cashValue = h.quantity * (h.current_price ?? 0)
      out.forEach((p) => {
        p.value += cashValue
      })
      continue
    }

    const series = priceHistoryByHoldingId[h.id] ?? []
    if (series.length === 0) {
      const fallbackValue = h.quantity * (h.current_price ?? 0)
      out.forEach((p) => {
        p.value += fallbackValue
      })
      continue
    }

    const byTimestamp = new Map<number, number>()
    series.forEach((p) => byTimestamp.set(p.timestamp, p.price))
    out.forEach((p) => {
      const price = byTimestamp.get(p.timestamp)
      if (price != null) p.value += h.quantity * price
    })
  }
  return out
}
