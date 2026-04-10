import { AllocationChart } from '@/components/AllocationChart'
import { DashboardHoldings } from '@/components/DashboardHoldings'
import { PerformanceBars } from '@/components/PerformanceBars'
import { PortfolioSummary } from '@/components/PortfolioSummary'
import {
  combineHoldingsByAsset,
  calcPortfolioHistorySeries24h,
  calcPortfolioSummary,
  enrichHoldingsWithPrices,
} from '@/lib/calculations'
import { mapRowToHolding } from '@/lib/mappers'
import { getLivePriceHistory24hByHoldingId, getLivePrices } from '@/lib/prices'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: rows }, { data: walletRows }] = await Promise.all([
    supabase.from('holdings').select('*').order('added_at', { ascending: false }),
    supabase.from('wallets').select('id').eq('user_id', user!.id).order('created_at', { ascending: true }).limit(1),
  ])

  const holdings = (rows ?? []).map((r) => mapRowToHolding(r as Record<string, unknown>))
  const keys = holdings.map((h) => ({
    id: h.id,
    symbol: h.symbol,
    asset_type: h.asset_type,
    coingecko_id: h.coingecko_id,
  }))
  const [prices, historyByHoldingId] = await Promise.all([
    getLivePrices(keys),
    getLivePriceHistory24hByHoldingId(keys, 15),
  ])
  const enriched = enrichHoldingsWithPrices(holdings, prices)
  const combined = combineHoldingsByAsset(enriched)
  const summary = calcPortfolioSummary(enriched)
  const performanceSeries = calcPortfolioHistorySeries24h(enriched, historyByHoldingId)
  const defaultWalletId = walletRows?.[0]?.id ? String(walletRows[0].id) : ''

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-fp-text">Dashboard</h1>
      <PortfolioSummary summary={summary} />
      <div className="grid gap-6 lg:grid-cols-2">
        <AllocationChart holdings={combined} />
        <PerformanceBars series={performanceSeries} />
      </div>
      <DashboardHoldings initialHoldings={combined} defaultWalletId={defaultWalletId} />
    </div>
  )
}
