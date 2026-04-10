import { HoldingsPageClient } from './HoldingsPageClient'
import { calcWalletValues, enrichHoldingsWithPrices } from '@/lib/calculations'
import { mapRowToHolding, mapRowToWallet } from '@/lib/mappers'
import { getLivePrices } from '@/lib/prices'
import { createClient } from '@/lib/supabase/server'

export default async function HoldingsPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { wallet: walletParam } = await searchParams

  const { data: walletRows } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })

  const wallets = (walletRows ?? []).map((r) => mapRowToWallet(r as Record<string, unknown>))
  const walletId =
    walletParam && wallets.some((w) => w.id === walletParam) ? walletParam : wallets[0]?.id ?? ''

  const { data: allRows } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', user!.id)
    .order('added_at', { ascending: false })

  const allHoldings = (allRows ?? []).map((r) => mapRowToHolding(r))
  const keys = allHoldings.map((h) => ({
    id: h.id,
    symbol: h.symbol,
    asset_type: h.asset_type,
    coingecko_id: h.coingecko_id,
  }))
  const prices = await getLivePrices(keys)
  const enrichedAll = enrichHoldingsWithPrices(allHoldings, prices)
  const walletValues = calcWalletValues(enrichedAll)
  const enriched = walletId
    ? enrichedAll.filter((h) => h.wallet_id === walletId)
    : []

  return (
    <HoldingsPageClient
      initialHoldings={enriched}
      wallets={wallets}
      initialWalletId={walletId}
      walletValues={walletValues}
    />
  )
}
