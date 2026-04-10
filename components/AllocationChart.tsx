'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import type { Holding } from '@/types'
import { calcHoldingPnL } from '@/lib/calculations'
import { contrastTextForBackground } from '@/lib/contrastText'
import { formatMoney } from '@/lib/format'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = ['#a89cf7', '#5dcaa5', '#378add', '#f472b6', '#fbbf24', '#38bdf8', '#a78bfa']

export function AllocationChart({ holdings }: { holdings: Holding[] }) {
  const { currency, usdToCad } = useDisplayCurrency()
  const total = holdings.reduce((s, h) => s + calcHoldingPnL(h).value, 0)
  const data = holdings.map((h) => {
    const { value } = calcHoldingPnL(h)
    return {
      name: h.symbol,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
    }
  })

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-fp-border bg-fp-surface text-sm text-fp-muted">
        Add holdings to see allocation
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-fp-border bg-fp-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-fp-text">Allocation</h2>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e6" />
            <XAxis type="number" tick={{ fill: '#6b6b6b', fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 'dataMax']} />
            <YAxis
              type="category"
              dataKey="name"
              width={48}
              tick={{ fill: '#6b6b6b', fontSize: 11 }}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0]
                const p = item.payload as { name: string; value: number; pct: number }
                const bg = typeof item.color === 'string' ? item.color : COLORS[0]
                const fg = contrastTextForBackground(bg)
                return (
                  <div
                    className="rounded-lg border border-fp-border px-3 py-2 text-xs"
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    <p className="font-medium" style={{ color: fg }}>
                      {p.name}
                    </p>
                    <p className="opacity-90" style={{ color: fg }}>
                      {p.pct.toFixed(1)}% · {formatMoney(p.value, currency, usdToCad)}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]} name="% of portfolio">
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
