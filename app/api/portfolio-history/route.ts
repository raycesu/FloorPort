import { filterKeysForHistoryFetch } from '@/lib/chartHistoryPolicy'
import { getFiatUsdHistoryByCurrency } from '@/lib/fx'
import {
  alignPortfolioSeriesToCurrentTotal,
  calcPortfolioHistorySeries,
  enrichHoldingsWithPrices,
  isReliableChartSeries,
} from '@/lib/calculations'
import { makeBucketTimestamps } from '@/lib/sources/chartUtils'
import { RANGE_CONFIG, type SupportedChartRange } from '@/lib/sources/types'
import { mapRowToHolding } from '@/lib/mappers'
import { getLivePriceHistoryByHoldingIdWithMeta, getLivePrices, toRangeKey } from '@/lib/prices'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const HISTORY_FETCH_TIMEOUT_MS = 50_000

function portfolioHistoryCacheTtlMs(range: SupportedChartRange): number {
  if (range === '7d') return 30_000
  if (range === '3m') return 5 * 60_000
  return 15 * 60_000
}

type PortfolioHistorySeriesPoint = { timestamp: number; value: number }
type PortfolioHistoryCacheEntry = {
  expiresAt: number
  series: PortfolioHistorySeriesPoint[]
  dataUpdatedAt: number
  dataIsStale: boolean
  reliable: boolean
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
  const range = toRangeKey(searchParams.get('range') ?? '7d')
  const walletId = searchParams.get('wallet_id')?.trim()
  const cacheKey = getPortfolioHistoryCacheKey(user.id, walletId ?? '', range)
  const now = Date.now()
  const cached = portfolioHistoryCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({
      series: cached.series,
      dataUpdatedAt: cached.dataUpdatedAt,
      dataIsStale: cached.dataIsStale,
      reliable: cached.reliable,
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

  const rangeConfig = RANGE_CONFIG[range]
  const bucketTimestamps = makeBucketTimestamps(rangeConfig.durationMs, rangeConfig.intervalMinutes)

  const cashCurrencies = holdings.filter((h) => h.asset_type === 'cash').map((h) => h.symbol)
  const [prices, fiatUsdHistory] = await Promise.all([
    getLivePrices(keys),
    getFiatUsdHistoryByCurrency(cashCurrencies, bucketTimestamps),
  ])
  const pricedHoldings = enrichHoldingsWithPrices(holdings, prices)
  const keysForHistory = filterKeysForHistoryFetch(keys, pricedHoldings)
  const historyPromise = getLivePriceHistoryByHoldingIdWithMeta(keysForHistory, range, {
    bucketTimestamps,
    historyCoinTimeoutMs: 30_000,
  })
  const historyResult = await Promise.race([
    historyPromise,
    new Promise<Awaited<typeof historyPromise>>((resolve) => {
      setTimeout(
        () =>
          resolve({
            history: {},
            meta: { fetchedAt: Date.now(), isStale: true },
          }),
        HISTORY_FETCH_TIMEOUT_MS
      )
    }),
  ])
  const rawSeries = calcPortfolioHistorySeries(
    pricedHoldings,
    historyResult.history,
    bucketTimestamps,
    fiatUsdHistory
  )
  const series = alignPortfolioSeriesToCurrentTotal(rawSeries, pricedHoldings)
  const reliable = isReliableChartSeries(series, pricedHoldings, historyResult.history)

  portfolioHistoryCache.set(cacheKey, {
    series,
    expiresAt: now + portfolioHistoryCacheTtlMs(range),
    dataUpdatedAt: historyResult.meta.fetchedAt,
    dataIsStale: historyResult.meta.isStale,
    reliable,
  })

  return NextResponse.json({
    series,
    dataUpdatedAt: historyResult.meta.fetchedAt,
    dataIsStale: historyResult.meta.isStale,
    reliable,
  })
}
