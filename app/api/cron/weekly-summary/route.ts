import { calcPortfolioSummary, enrichHoldingsWithPrices } from '@/lib/calculations'
import { mapRowToHolding } from '@/lib/mappers'
import { getLivePrices, type PriceKey } from '@/lib/prices'
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'
import { sendTelegramMessage } from '@/lib/telegram'
import {
  buildSnapshotHoldings,
  diffWeeklySnapshots,
  formatWeeklyTelegramMessage,
  type PortfolioSnapshotData,
} from '@/lib/weeklySummary'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

type PortfolioSnapshotRow = {
  created_at: string
  total_value_usd: number
  holdings: unknown
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const authHeader = request.headers.get('authorization')?.trim()
  return authHeader === `Bearer ${secret}`
}

function toSnapshotData(row: PortfolioSnapshotRow): PortfolioSnapshotData {
  const holdings = Array.isArray(row.holdings) ? row.holdings : []
  return {
    totalValueUsd: Number(row.total_value_usd),
    holdings: holdings as PortfolioSnapshotData['holdings'],
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = process.env.CRON_USER_ID?.trim()
  if (!userId) {
    return NextResponse.json({ error: 'CRON_USER_ID is not configured' }, { status: 500 })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase service role is not configured' }, { status: 500 })
  }

  try {
    const { data: holdingRows, error: holdingsError } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId)

    if (holdingsError) {
      return NextResponse.json({ error: holdingsError.message }, { status: 500 })
    }

    const holdings = (holdingRows ?? []).map((row) => mapRowToHolding(row as Record<string, unknown>))
    const priceKeys: PriceKey[] = holdings.map((h) => ({
      id: h.id,
      symbol: h.symbol,
      asset_type: h.asset_type,
      coingecko_id: h.coingecko_id,
    }))

    const prices = await getLivePrices(priceKeys)
    const pricedHoldings = enrichHoldingsWithPrices(holdings, prices)
    const summary = calcPortfolioSummary(pricedHoldings)

    const currentSnapshot: PortfolioSnapshotData = {
      totalValueUsd: summary.total_value,
      holdings: buildSnapshotHoldings(pricedHoldings),
    }

    const { data: previousRows, error: previousError } = await supabase
      .from('portfolio_snapshots')
      .select('created_at, total_value_usd, holdings')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (previousError) {
      return NextResponse.json({ error: previousError.message }, { status: 500 })
    }

    const previousSnapshot = previousRows?.[0]
      ? toSnapshotData(previousRows[0] as PortfolioSnapshotRow)
      : null

    const { error: insertError } = await supabase.from('portfolio_snapshots').insert({
      user_id: userId,
      total_value_usd: currentSnapshot.totalValueUsd,
      holdings: currentSnapshot.holdings,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const diff = diffWeeklySnapshots(previousSnapshot, currentSnapshot)
    const message = formatWeeklyTelegramMessage(diff, currentSnapshot.totalValueUsd)
    const telegramSent = await sendTelegramMessage(message)

    return NextResponse.json({
      ok: true,
      totalValueUsd: currentSnapshot.totalValueUsd,
      diff,
      telegramSent,
    })
  } catch (error) {
    console.error('weekly-summary cron failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
