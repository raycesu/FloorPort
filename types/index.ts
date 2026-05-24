export type AssetType = 'crypto' | 'stock' | 'cash'

export type DisplayCurrency = 'USD' | 'CAD'

export type PerformanceRange = '7D' | '3M' | '1Y'

export type Wallet = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type Holding = {
  id: string
  user_id: string
  wallet_id: string
  symbol: string
  name: string
  asset_type: AssetType
  quantity: number
  avg_buy_price: number
  coingecko_id?: string | null
  added_at: string
  current_price?: number
  current_value?: number
  pnl?: number
  pnl_percent?: number
  change_1d?: number
  change_7d?: number
}

export type PortfolioSummary = {
  total_value: number
  total_cost: number
  total_pnl: number
  total_pnl_percent: number
  crypto_value: number
  stock_value: number
  cash_value: number
}
