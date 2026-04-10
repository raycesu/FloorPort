import type { AssetType } from '@/types'

export const FIAT_ALLOWLIST = new Set(['USD', 'CAD', 'EUR', 'GBP'])

export function parseAssetType(v: unknown): AssetType | null {
  if (v === 'stock') return 'stock'
  if (v === 'crypto') return 'crypto'
  if (v === 'cash') return 'cash'
  return null
}
