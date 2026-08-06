import { HoldingsPageClient } from './HoldingsPageClient'
import {
  calcPortfolioSummary,
  calcWalletValues,
  enrichHoldingsWithMarketChanges,
  enrichHoldingsWithPrices,
} from '@/lib/calculations'
import { mapRowToHolding, mapRowToWallet } from '@/lib/mappers'
import {
  getLiveChangePercent,
  getLivePrices,
  getLive7dChangePercentBySymbol,
  mergeHoldingChangePercents,
} from '@/lib/prices'
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
  const userId = user?.id
  if (!userId) {
    throw new Error('Authenticated user not found for holdings route')
  }

  const { wallet: walletParam } = await searchParams

  const { data: walletRows } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  const wallets = (walletRows ?? []).map((r) => mapRowToWallet(r as Record<string, unknown>))
  const walletId =
    walletParam && wallets.some((w) => w.id === walletParam) ? walletParam : wallets[0]?.id ?? ''

  const { data: allRows } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })

  const allHoldings = (allRows ?? []).map((r) => mapRowToHolding(r))
  const allKeys = allHoldings.map((h) => ({
    id: h.id,
    symbol: h.symbol,
    asset_type: h.asset_type,
    coingecko_id: h.coingecko_id,
  }))

  const [prices, change1dBySymbol, change7dBySymbol] = await Promise.all([
    getLivePrices(allKeys),
    getLiveChangePercent(allKeys),
    getLive7dChangePercentBySymbol(allKeys),
  ])
  const changePercents = mergeHoldingChangePercents(allKeys, change1dBySymbol, change7dBySymbol)
  const enrichedAll = enrichHoldingsWithMarketChanges(
    enrichHoldingsWithPrices(allHoldings, prices),
    changePercents
  )
  const walletValues = calcWalletValues(enrichedAll)
  const enriched = walletId ? enrichedAll.filter((h) => h.wallet_id === walletId) : []
  const walletSummary = calcPortfolioSummary(enriched)

  return (
    <HoldingsPageClient
      initialHoldings={enriched}
      wallets={wallets}
      initialWalletId={walletId}
      walletValues={walletValues}
      walletSummary={walletSummary}
    />
  )
}
