'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { PriceChart } from '@/components/PriceChart'
import { formatMoney, formatPercent, formatQuantity } from '@/lib/format'
import type { Holding } from '@/types'

export function HoldingsTable({
  holdings,
  showActions = false,
  showChart = true,
  onEdit,
  onDelete,
}: {
  holdings: Holding[]
  showActions?: boolean
  showChart?: boolean
  onEdit?: (h: Holding) => void
  onDelete?: (h: Holding) => void
}) {
  const { currency, usdToCad } = useDisplayCurrency()
  const m = (n: number) => formatMoney(n, currency, usdToCad)

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-fp-border bg-fp-surface py-16 text-center text-sm text-fp-muted">
        No holdings yet. Add one to get started.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-fp-surface">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-fp-border text-[11px] uppercase tracking-wide text-fp-muted">
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Avg buy</th>
            <th className="px-4 py-3 text-right">Current</th>
            <th className="px-4 py-3 text-right">Value</th>
            <th className="px-4 py-3 text-right">P&amp;L</th>
            <th className="px-4 py-3 text-right">P&amp;L %</th>
            {showChart ? <th className="px-4 py-3">7d</th> : null}
            {showActions ? <th className="px-4 py-3 text-right">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const pnl = h.pnl ?? 0
            const pnlPct = h.pnl_percent ?? 0
            const pnlClass = pnl >= 0 ? 'text-fp-positive' : 'text-fp-negative'
            const isCash = h.asset_type === 'cash'
            const typeClass =
              h.asset_type === 'crypto'
                ? 'bg-fp-crypto-bg text-fp-crypto-text'
                : h.asset_type === 'stock'
                  ? 'bg-fp-stock-bg text-fp-stock-text'
                  : 'bg-fp-page text-fp-muted'
            return (
              <tr key={h.id} className="border-b border-fp-border hover:bg-fp-page/70">
                <td className="px-4 py-3 font-medium text-fp-text">{h.symbol}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeClass}`}>
                    {h.asset_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-fp-muted">
                  {formatQuantity(h.quantity)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-fp-muted">
                  {isCash ? '—' : m(h.avg_buy_price)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-fp-muted">
                  {h.current_price != null ? m(h.current_price) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-fp-text">
                  {h.current_value != null ? m(h.current_value) : '—'}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${pnlClass}`}>
                  {isCash ? '—' : h.current_price != null ? m(pnl) : '—'}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${pnlClass}`}>
                  {isCash ? '—' : h.current_price != null ? formatPercent(pnlPct) : '—'}
                </td>
                {showChart ? (
                  <td className="px-4 py-3">
                    {isCash ? (
                      <span className="text-xs text-fp-muted">—</span>
                    ) : (
                      <PriceChart
                        symbol={h.symbol}
                        assetType={h.asset_type as 'crypto' | 'stock'}
                      />
                    )}
                  </td>
                ) : null}
                {showActions ? (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit?.(h)}
                      className="mr-2 text-[13px] text-fp-accent hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(h)}
                      className="text-[13px] text-fp-negative hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
