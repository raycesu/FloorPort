'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { formatMoney, formatPercent } from '@/lib/format'
import type { PortfolioSummary as Summary } from '@/types'

export function PortfolioSummary({ summary }: { summary: Summary }) {
  const { currency, usdToCad } = useDisplayCurrency()
  const m = (n: number) => formatMoney(n, currency, usdToCad)

  const cards = [
    {
      label: 'Total value',
      value: m(summary.total_value),
      valueColor: '#e4e4e7',
    },
    {
      label: 'Total gain / loss',
      value: m(summary.total_pnl),
      valueColor: summary.total_pnl >= 0 ? '#4ade80' : '#f87171',
      badge: formatPercent(summary.total_pnl_percent),
      badgePnl: summary.total_pnl,
    },
    {
      label: 'Crypto total',
      value: m(summary.crypto_value),
      valueColor: '#9b8ee0',
    },
    {
      label: 'Stocks total',
      value: m(summary.stock_value),
      valueColor: '#34d399',
    },
    {
      label: 'Cash total',
      value: m(summary.cash_value),
      valueColor: '#e4e4e7',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-[14px] px-6 py-5 transition-all duration-200"
          style={{
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,111,212,0.3)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'
          }}
        >
          <p
            className="font-medium uppercase tracking-[0.08em]"
            style={{ fontSize: '11px', color: '#52525b' }}
          >
            {c.label}
          </p>
          <p
            className="mt-2 font-bold tabular-nums leading-none"
            style={{ fontSize: '28px', color: c.valueColor }}
          >
            {c.value}
          </p>
          {'badge' in c && c.badge ? (
            <span
              className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
              style={
                (c.badgePnl ?? 0) >= 0
                  ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' }
                  : { background: 'rgba(239,68,68,0.12)', color: '#f87171' }
              }
            >
              {c.badge}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
