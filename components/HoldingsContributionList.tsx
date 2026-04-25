'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { calcHoldingPnL } from '@/lib/calculations'
import { formatMoney, formatPercent } from '@/lib/format'
import type { Holding } from '@/types'
import { useMemo } from 'react'

type ContributionRow = {
  id: string
  symbol: string
  name: string
  value: number
  pnl: number
  pnlPercent: number
  share: number
}

export function HoldingsContributionList({ holdings }: { holdings: Holding[] }) {
  const { currency, usdToCad } = useDisplayCurrency()

  const rows = useMemo(() => {
    const nonCash = holdings
      .filter((holding) => holding.asset_type !== 'cash')
      .map((holding) => {
        const { value, pnl, pnl_percent } = calcHoldingPnL(holding)
        return {
          id: holding.id,
          symbol: holding.symbol,
          name: holding.name || holding.symbol,
          value,
          pnl,
          pnlPercent: pnl_percent,
        }
      })
      .filter((holding) => holding.value > 0)

    const totalImpact = nonCash.reduce((sum, holding) => sum + Math.abs(holding.pnl), 0)

    return nonCash
      .map((holding) => ({
        ...holding,
        share: totalImpact > 0 ? (Math.abs(holding.pnl) / totalImpact) * 100 : 0,
      }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 5)
  }, [holdings])

  const totalPnl = rows.reduce((sum, row) => sum + row.pnl, 0)
  const isPositive = totalPnl >= 0

  return (
    <section className="rounded-[24px] border border-fp-border bg-[#161b24] shadow-[0_18px_40px_rgba(3,8,20,0.22)]">
      <div className="flex flex-col gap-2 border-b border-[rgba(159,174,197,0.12)] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-fp-text">Contribution</h2>
          <p className="mt-1 text-[13px] text-fp-muted">Assets driving this wallet&apos;s gains and losses</p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
            isPositive
              ? 'bg-[rgba(74,222,128,0.1)] text-fp-positive'
              : 'bg-[rgba(248,113,113,0.1)] text-[#f87171]'
          }`}
        >
          {formatMoney(totalPnl, currency, usdToCad)}
        </span>
      </div>

      <div className="p-6">
        {rows.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center rounded-[20px] border border-dashed border-fp-border text-sm text-fp-muted">
            Add market positions to see contribution
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <ContributionItem
                key={row.id}
                row={row}
                formatValue={(value) => formatMoney(value, currency, usdToCad)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ContributionItem({
  row,
  formatValue,
}: {
  row: ContributionRow
  formatValue: (value: number) => string
}) {
  const isPositive = row.pnl >= 0

  return (
    <div className="rounded-[18px] border border-[rgba(159,174,197,0.12)] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fp-text">{row.symbol}</p>
          <p className="mt-1 truncate text-xs text-fp-muted">{row.name}</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-fp-positive' : 'text-[#f87171]'}`}>
            {formatValue(row.pnl)}
          </p>
          <p className="mt-1 text-xs tabular-nums text-fp-muted">{formatPercent(row.pnlPercent)}</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#10151f]">
        <div
          className={`h-full rounded-full ${isPositive ? 'bg-fp-positive' : 'bg-[#f87171]'}`}
          style={{ width: `${Math.max(row.share, 4)}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-fp-muted">
        <span>Impact</span>
        <span>{row.share.toFixed(1)}%</span>
      </div>
    </div>
  )
}
