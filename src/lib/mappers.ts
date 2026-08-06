import type { AssetType, Holding, Wallet } from '@/types'

function mapAssetType(v: unknown): AssetType {
  if (v === 'stock') return 'stock'
  if (v === 'cash') return 'cash'
  return 'crypto'
}

export function mapRowToHolding(row: Record<string, unknown>): Holding {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    wallet_id: String(row.wallet_id ?? ''),
    symbol: String(row.symbol),
    name: String(row.name),
    asset_type: mapAssetType(row.asset_type),
    quantity: Number(row.quantity),
    avg_buy_price: Number(row.avg_buy_price),
    coingecko_id: row.coingecko_id != null ? String(row.coingecko_id) : null,
    added_at: String(row.added_at),
  }
}

export function mapRowToWallet(row: Record<string, unknown>): Wallet {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    created_at: String(row.created_at),
  }
}
