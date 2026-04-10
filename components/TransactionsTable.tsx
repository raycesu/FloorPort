'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { formatMoney, formatQuantity } from '@/lib/format'
import type { Transaction } from '@/types'

const txDateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const txTimeFmt = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
})

export function TransactionsTable({ list }: { list: Transaction[] }) {
  const { currency, usdToCad } = useDisplayCurrency()
  const m = (n: number) => formatMoney(n, currency, usdToCad)

  return (
    <div className="overflow-x-auto rounded-xl bg-fp-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-fp-border text-[11px] uppercase tracking-wide text-fp-muted">
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
            const d = new Date(t.executed_at)
            const dateLine = Number.isNaN(d.getTime()) ? '—' : txDateFmt.format(d)
            const timeLine = Number.isNaN(d.getTime()) ? '' : `${txTimeFmt.format(d)} UTC`
            const typeClass =
              t.asset_type === 'crypto'
                ? 'bg-fp-crypto-bg text-fp-crypto-text'
                : t.asset_type === 'stock'
                  ? 'bg-fp-stock-bg text-fp-stock-text'
                  : 'bg-fp-page text-fp-muted'
            return (
              <tr key={t.id} className="h-12 border-b border-fp-border hover:bg-fp-page">
                <td className="px-4 py-2 tabular-nums">
                  <p className="text-sm text-fp-text">{dateLine}</p>
                  <p className="text-xs text-fp-muted">{timeLine}</p>
                </td>
                <td className="px-4 py-2 font-medium text-fp-text">{t.symbol}</td>
                <td className="px-4 py-2">
                  <span className={`mr-1 rounded px-2 py-0.5 text-xs font-medium ${typeClass}`}>
                    {t.asset_type}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      t.type === 'buy' ? 'bg-fp-buy-bg text-fp-buy-text' : 'bg-fp-sell-bg text-fp-sell-text'
                    }`}
                  >
                    {t.type === 'buy' ? 'Buy' : 'Sell'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-fp-muted">{formatQuantity(t.quantity)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-fp-muted">{m(t.price)}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium text-fp-text">{m(total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
