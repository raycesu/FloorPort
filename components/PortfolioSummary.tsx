'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { formatMoney, formatPercent } from '@/lib/format'
import type { PortfolioSummary as Summary } from '@/types'

export function PortfolioSummary({ summary }: { summary: Summary }) {
  const { currency, usdToCad } = useDisplayCurrency()
  const m = (n: number) => formatMoney(n, currency, usdToCad)
  const cards = [
    { label: 'Total value', value: m(summary.total_value), accent: 'text-white' },
    {
      label: 'Total gain / loss',
      value: m(summary.total_pnl),
      sub: formatPercent(summary.total_pnl_percent),
      accent: summary.total_pnl >= 0 ? 'text-fp-positive' : 'text-fp-negative',
    },
    { label: 'Crypto total', value: m(summary.crypto_value), accent: 'text-fp-crypto' },
    { label: 'Stocks total', value: m(summary.stock_value), accent: 'text-fp-stock' },
    { label: 'Cash total', value: m(summary.cash_value), accent: 'text-zinc-200' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-white/10 bg-fp-surface px-5 py-4 backdrop-blur"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{c.label}</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${c.accent}`}>{c.value}</p>
          {'sub' in c && c.sub ? (
            <p
              className={`mt-0.5 text-sm tabular-nums ${summary.total_pnl >= 0 ? 'text-fp-positive' : 'text-fp-negative'}`}
            >
              {c.sub}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
