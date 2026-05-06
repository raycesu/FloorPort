import { HoldingsPageClient } from './HoldingsPageClient'
import {
  calcPortfolioHistorySeries,
  calcPortfolioSummary,
  calcWalletValues,
  enrichHoldingsWithMarketChanges,
  enrichHoldingsWithPrices,
} from '@/lib/calculations'
import { mapRowToHolding, mapRowToWallet } from '@/lib/mappers'
import {
  getLiveChangePercent,
  getLivePriceHistoryByHoldingIdWithMeta,
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
  const keys = allHoldings.map((h) => ({
    id: h.id,
    symbol: h.symbol,
    asset_type: h.asset_type,
    coingecko_id: h.coingecko_id,
  }))
  const stockKeys = keys.filter((k) => k.asset_type === 'stock')
  const [prices, change1dBySymbol, change7dBySymbol, stock7dHistory] = await Promise.all([
    getLivePrices(keys),
    getLiveChangePercent(keys),
    getLive7dChangePercentBySymbol(keys),
    stockKeys.length
      ? getLivePriceHistoryByHoldingIdWithMeta(stockKeys, '7D', { preferFastFail: true }).then((r) => r.history)
      : Promise.resolve({}),
  ])
  const changePercents = mergeHoldingChangePercents(keys, change1dBySymbol, change7dBySymbol, stock7dHistory)
  const enrichedAll = enrichHoldingsWithMarketChanges(
    enrichHoldingsWithPrices(allHoldings, prices),
    changePercents
  )
  const walletValues = calcWalletValues(enrichedAll)
  const enriched = walletId
    ? enrichedAll.filter((h) => h.wallet_id === walletId)
    : []
  const selectedKeys = enriched.map((h) => ({
    id: h.id,
    symbol: h.symbol,
    asset_type: h.asset_type,
    coingecko_id: h.coingecko_id,
  }))
  const hist24 = await getLivePriceHistoryByHoldingIdWithMeta(selectedKeys, '24H', {
    preferFastFail: true,
  })
  const performanceSeries = calcPortfolioHistorySeries(enriched, hist24.history)
  const walletSummary = calcPortfolioSummary(enriched)

  return (
    <HoldingsPageClient
      initialHoldings={enriched}
      wallets={wallets}
      initialWalletId={walletId}
      walletValues={walletValues}
      walletSummary={walletSummary}
      performanceSeries={performanceSeries}
      performanceMeta={{ fetchedAt: hist24.meta.fetchedAt, isStale: hist24.meta.isStale }}
    />
  )
}
