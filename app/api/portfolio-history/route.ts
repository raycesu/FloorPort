import { calcPortfolioHistorySeries, enrichHoldingsWithPrices } from '@/lib/calculations'
import { mapRowToHolding } from '@/lib/mappers'
import { getLivePriceHistoryByHoldingIdWithMeta, getLivePrices, toRangeKey } from '@/lib/prices'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
const PORTFOLIO_HISTORY_CACHE_TTL_MS = 30_000

type PortfolioHistorySeriesPoint = { timestamp: number; value: number }
type PortfolioHistoryCacheEntry = {
  expiresAt: number
  series: PortfolioHistorySeriesPoint[]
  dataUpdatedAt: number
  dataIsStale: boolean
}

const portfolioHistoryCache = new Map<string, PortfolioHistoryCacheEntry>()

function getPortfolioHistoryCacheKey(userId: string, walletId: string, range: string) {
  return `${userId}:${walletId || 'all'}:${range}`
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = new URL(request.url).searchParams
  const range = toRangeKey(searchParams.get('range') ?? '24h')
  const walletId = searchParams.get('wallet_id')?.trim()
  const cacheKey = getPortfolioHistoryCacheKey(user.id, walletId ?? '', range)
  const now = Date.now()
  const cached = portfolioHistoryCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({
      series: cached.series,
      dataUpdatedAt: cached.dataUpdatedAt,
      dataIsStale: cached.dataIsStale,
    })
  }

  let query = supabase
    .from('holdings')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })

  if (walletId) query = query.eq('wallet_id', walletId)

  const { data: rows, error: holdingsError } = await query

  if (holdingsError) {
    return NextResponse.json({ error: holdingsError.message }, { status: 500 })
  }

  const holdings = (rows ?? []).map((row) => mapRowToHolding(row as Record<string, unknown>))
  const keys = holdings.map((h) => ({
    id: h.id,
    symbol: h.symbol,
    asset_type: h.asset_type,
    coingecko_id: h.coingecko_id,
  }))

  const [prices, historyResult] = await Promise.all([
    getLivePrices(keys),
    getLivePriceHistoryByHoldingIdWithMeta(keys, range, { preferFastFail: true }),
  ])

  const enriched = enrichHoldingsWithPrices(holdings, prices)
  const series = calcPortfolioHistorySeries(enriched, historyResult.history)
  portfolioHistoryCache.set(cacheKey, {
    series,
    expiresAt: now + PORTFOLIO_HISTORY_CACHE_TTL_MS,
    dataUpdatedAt: historyResult.meta.fetchedAt,
    dataIsStale: historyResult.meta.isStale,
  })

  return NextResponse.json({
    series,
    dataUpdatedAt: historyResult.meta.fetchedAt,
    dataIsStale: historyResult.meta.isStale,
  })
}
