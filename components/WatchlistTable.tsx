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
      <div className="rounded-xl border border-dashed border-white/15 bg-fp-surface py-16 text-center text-sm text-zinc-500">
        Your watchlist is empty. Add symbols to track prices without holding them.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-fp-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
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
              ch == null ? 'text-zinc-500' : ch >= 0 ? 'text-fp-positive' : 'text-fp-negative'
            return (
              <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-white">{w.symbol}</td>
                <td className="px-4 py-3 text-zinc-400">{w.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      w.asset_type === 'crypto'
                        ? 'bg-fp-crypto/15 text-fp-crypto'
                        : 'bg-fp-stock/15 text-fp-stock'
                    }`}
                  >
                    {w.asset_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-200">
                  {w.current_price != null ? m(w.current_price) : '—'}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums text-sm ${chClass}`}>
                  {ch != null ? formatPercent(ch) : '—'}
                </td>
                <td className="px-4 py-3">
                  <PriceChart symbol={w.symbol} assetType={w.asset_type} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(w.id)}
                    className="text-sm text-fp-negative hover:underline"
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
