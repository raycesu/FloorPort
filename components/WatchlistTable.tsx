'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { PriceChart } from '@/components/PriceChart'
import { formatMoney, formatPercent } from '@/lib/format'
import type { WatchlistItem } from '@/types'

export function WatchlistTable({
  items,
  onRemove,
}: {
  items: WatchlistItem[]
  onRemove: (id: string) => void
}) {
  const { currency, usdToCad } = useDisplayCurrency()
  const m = (n: number) => formatMoney(n, currency, usdToCad)

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-fp-border bg-fp-surface py-16 text-center text-sm text-fp-muted">
        Your watchlist is empty. Add symbols to track prices without holding them.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-fp-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-fp-border text-[11px] uppercase tracking-wide text-fp-muted">
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">24h</th>
            <th className="px-4 py-3">7d</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((w) => {
            const ch = w.change_24h
            const chClass =
              ch == null ? 'text-fp-muted' : ch >= 0 ? 'text-fp-positive' : 'text-fp-negative'
            return (
              <tr key={w.id} className="h-12 border-b border-fp-border hover:bg-fp-page">
                <td className="px-4 py-2 font-medium text-fp-text">{w.symbol}</td>
                <td className="px-4 py-2 text-fp-muted">{w.name}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      w.asset_type === 'crypto'
                        ? 'bg-fp-crypto-bg text-fp-crypto-text'
                        : w.asset_type === 'stock'
                          ? 'bg-fp-stock-bg text-fp-stock-text'
                          : 'bg-fp-page text-fp-muted'
                    }`}
                  >
                    {w.asset_type}
                  </span>
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-fp-text">
                  {w.current_price != null ? m(w.current_price) : '—'}
                </td>
                <td className={`px-4 py-2 text-right tabular-nums text-sm font-medium ${chClass}`}>
                  {ch != null ? formatPercent(ch) : '—'}
                </td>
                <td className="px-4 py-2">
                  {w.asset_type === 'cash' ? (
                    <span className="text-xs text-fp-muted">—</span>
                  ) : (
                    <PriceChart symbol={w.symbol} assetType={w.asset_type} compact />
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(w.id)}
                    className="text-[13px] text-fp-negative hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
