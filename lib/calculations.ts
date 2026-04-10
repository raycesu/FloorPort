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

/** Sum live position value per wallet (USD; use display currency on the client). */
export function calcWalletValues(holdings: Holding[]): Record<string, number> {
  const byWallet: Record<string, number> = {}
  for (const h of holdings) {
    const { value } = calcHoldingPnL(h)
    byWallet[h.wallet_id] = (byWallet[h.wallet_id] ?? 0) + value
  }
  return byWallet
}
