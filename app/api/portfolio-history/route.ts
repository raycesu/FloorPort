import { calcPortfolioHistorySeries, enrichHoldingsWithPrices } from '@/lib/calculations'
import { mapRowToHolding } from '@/lib/mappers'
import { getLivePriceHistoryByHoldingId, getLivePrices, toRangeKey } from '@/lib/prices'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const range = toRangeKey(new URL(request.url).searchParams.get('range') ?? '24h')
  const { data: rows } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })

  const holdings = (rows ?? []).map((row) => mapRowToHolding(row as Record<string, unknown>))
  const keys = holdings.map((h) => ({
    id: h.id,
    symbol: h.symbol,
    asset_type: h.asset_type,
    coingecko_id: h.coingecko_id,
  }))

  const [prices, historyByHoldingId] = await Promise.all([
    getLivePrices(keys),
    getLivePriceHistoryByHoldingId(keys, range),
  ])

  const enriched = enrichHoldingsWithPrices(holdings, prices)
  const series = calcPortfolioHistorySeries(enriched, historyByHoldingId)

  return NextResponse.json({ series })
}
