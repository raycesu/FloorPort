'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { formatExecutedAt, formatMoney, formatQuantity } from '@/lib/format'
import type { Transaction } from '@/types'

export function TransactionsTable({ list }: { list: Transaction[] }) {
  const { currency, usdToCad } = useDisplayCurrency()
  const m = (n: number) => formatMoney(n, currency, usdToCad)

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-fp-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3 text-right">Quantity</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => {
            const total = t.quantity * t.price
            const typeClass =
              t.asset_type === 'crypto'
                ? 'bg-fp-crypto/15 text-fp-crypto'
                : t.asset_type === 'stock'
                  ? 'bg-fp-stock/15 text-fp-stock'
                  : 'bg-zinc-500/15 text-zinc-300'
            return (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 tabular-nums text-zinc-400">
                  {formatExecutedAt(t.executed_at)}
                </td>
                <td className="px-4 py-3 font-medium text-white">{t.symbol}</td>
                <td className="px-4 py-3">
                  <span className={`mr-1 rounded px-2 py-0.5 text-xs font-medium ${typeClass}`}>
                    {t.asset_type}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      t.type === 'buy' ? 'bg-fp-positive/15 text-fp-positive' : 'bg-fp-negative/15 text-fp-negative'
                    }`}
                  >
                    {t.type === 'buy' ? 'Buy' : 'Sell'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{formatQuantity(t.quantity)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{m(t.price)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-200">{m(total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
