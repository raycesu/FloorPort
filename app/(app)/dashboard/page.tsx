import { AllocationChart } from '@/components/AllocationChart'
import { DashboardHoldings } from '@/components/DashboardHoldings'
import { PerformanceBars } from '@/components/PerformanceBars'
import { PortfolioSummary } from '@/components/PortfolioSummary'
import {
  combineHoldingsByAsset,
  calcPortfolioHistorySeries,
  calcPortfolioSummary,
  enrichHoldingsWithMarketChanges,
  enrichHoldingsWithPrices,
} from '@/lib/calculations'
import { mapRowToHolding } from '@/lib/mappers'
import { getHoldingChangePercents, getLivePriceHistoryByHoldingId, getLivePrices } from '@/lib/prices'
import { createClient } from '@/lib/supabase/server'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTodayDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

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
  const [prices, changePercents, historyByHoldingId] = await Promise.all([
    getLivePrices(keys),
    getHoldingChangePercents(keys),
    getLivePriceHistoryByHoldingId(keys, '24H'),
  ])
  const enriched = enrichHoldingsWithMarketChanges(
    enrichHoldingsWithPrices(holdings, prices),
    changePercents
  )
  const combined = combineHoldingsByAsset(enriched)
  const summary = calcPortfolioSummary(enriched)
  const performanceSeries = calcPortfolioHistorySeries(enriched, historyByHoldingId)
  const defaultWalletId = walletRows?.[0]?.id ? String(walletRows[0].id) : ''

  const firstName = user?.email?.split('@')[0] ?? 'there'
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1
          className="font-semibold"
          style={{ fontSize: '24px', color: '#f5f7fb' }}
        >
          {getGreeting()}, {displayName}
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#93a0b4' }}>
          {formatTodayDate()}
        </p>
      </div>

      <PortfolioSummary summary={summary} />

      <div className="grid gap-5 xl:grid-cols-[1.02fr_1.18fr]">
        <AllocationChart holdings={combined} />
        <PerformanceBars series={performanceSeries} />
      </div>

      <DashboardHoldings initialHoldings={combined} defaultWalletId={defaultWalletId} />
    </div>
  )
}
