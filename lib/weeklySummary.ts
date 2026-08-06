import { formatPercent, formatUsd } from '@/lib/format'
import type { AssetType, Holding } from '@/types'

/** Shape persisted in `portfolio_snapshots.holdings` (jsonb array). */
export type SnapshotHolding = {
  holding_id: string
  symbol: string
  name: string
  asset_type: AssetType
  quantity: number
  price_usd: number
  value_usd: number
}

export type PortfolioSnapshotData = {
  totalValueUsd: number
  holdings: SnapshotHolding[]
}

export type WeeklyMover = {
  symbol: string
  name: string
  changePercent: number
  priceUsdPrevious: number
  priceUsdCurrent: number
}

export type WeeklyDiffResult =
  | { firstRun: true }
  | {
      firstRun: false
      totalValueUsdPrevious: number
      totalValueUsdCurrent: number
      totalChangeUsd: number
      totalChangePercent: number
      biggestLoser: WeeklyMover | null
      biggestGainer: WeeklyMover | null
    }

/** Build the jsonb-ready snapshot rows from priced holdings (skips holdings with no live price). */
export function buildSnapshotHoldings(holdings: Holding[]): SnapshotHolding[] {
  const out: SnapshotHolding[] = []
  for (const h of holdings) {
    if (h.current_price == null || !Number.isFinite(h.current_price) || h.current_price <= 0) continue
    out.push({
      holding_id: h.id,
      symbol: h.symbol,
      name: h.name,
      asset_type: h.asset_type,
      quantity: h.quantity,
      price_usd: h.current_price,
      value_usd: h.current_value ?? h.quantity * h.current_price,
    })
  }
  return out
}

function fallbackMatchKey(symbol: string, assetType: AssetType): string {
  return `${assetType}:${symbol.trim().toUpperCase()}`
}

/**
 * Diffs the current snapshot against the previous one. Per-asset "movers" are ranked by
 * price percentage change (not $ value change, so buys/sells mid-week don't distort it) and
 * exclude cash (no meaningful price movement to report).
 */
export function diffWeeklySnapshots(
  previous: PortfolioSnapshotData | null,
  current: PortfolioSnapshotData
): WeeklyDiffResult {
  if (!previous) return { firstRun: true }

  const previousById = new Map<string, SnapshotHolding>()
  const previousByFallbackKey = new Map<string, SnapshotHolding>()
  for (const h of previous.holdings) {
    previousById.set(h.holding_id, h)
    previousByFallbackKey.set(fallbackMatchKey(h.symbol, h.asset_type), h)
  }

  let biggestLoser: WeeklyMover | null = null
  let biggestGainer: WeeklyMover | null = null

  for (const h of current.holdings) {
    if (h.asset_type === 'cash') continue
    if (h.price_usd <= 0) continue

    const match = previousById.get(h.holding_id) ?? previousByFallbackKey.get(fallbackMatchKey(h.symbol, h.asset_type))
    if (!match || match.price_usd <= 0) continue

    const changePercent = ((h.price_usd - match.price_usd) / match.price_usd) * 100
    if (!Number.isFinite(changePercent)) continue

    const mover: WeeklyMover = {
      symbol: h.symbol,
      name: h.name,
      changePercent,
      priceUsdPrevious: match.price_usd,
      priceUsdCurrent: h.price_usd,
    }

    if (!biggestLoser || mover.changePercent < biggestLoser.changePercent) biggestLoser = mover
    if (!biggestGainer || mover.changePercent > biggestGainer.changePercent) biggestGainer = mover
  }

  const totalValueUsdPrevious = previous.totalValueUsd
  const totalValueUsdCurrent = current.totalValueUsd
  const totalChangeUsd = totalValueUsdCurrent - totalValueUsdPrevious
  const totalChangePercent =
    totalValueUsdPrevious > 0 ? (totalChangeUsd / totalValueUsdPrevious) * 100 : 0

  return {
    firstRun: false,
    totalValueUsdPrevious,
    totalValueUsdCurrent,
    totalChangeUsd,
    totalChangePercent,
    biggestLoser,
    biggestGainer,
  }
}

function trendEmoji(changePercent: number): string {
  if (changePercent > 0) return '📈'
  if (changePercent < 0) return '📉'
  return '➡️'
}

export function formatWeeklyTelegramMessage(diff: WeeklyDiffResult, totalValueUsd: number): string {
  if (diff.firstRun) {
    return [
      '📊 <b>FloorPort Weekly Summary</b>',
      '',
      `Total: ${formatUsd(totalValueUsd)}`,
      '',
      'First snapshot captured — weekly comparisons will start next week.',
    ].join('\n')
  }

  const lines = [
    '📊 <b>FloorPort Weekly Summary</b>',
    '',
    `Total: ${formatUsd(diff.totalValueUsdCurrent)} (${trendEmoji(diff.totalChangePercent)} ${formatPercent(
      diff.totalChangePercent
    )} this week, ${formatUsd(diff.totalChangeUsd)})`,
    '',
  ]

  if (diff.biggestLoser) {
    lines.push(`📉 Biggest loser: ${diff.biggestLoser.symbol} ${formatPercent(diff.biggestLoser.changePercent)}`)
  }
  if (diff.biggestGainer) {
    lines.push(`📈 Biggest gainer: ${diff.biggestGainer.symbol} ${formatPercent(diff.biggestGainer.changePercent)}`)
  }
  if (!diff.biggestLoser && !diff.biggestGainer) {
    lines.push('No priced assets to compare this week.')
  }

  return lines.join('\n')
}
