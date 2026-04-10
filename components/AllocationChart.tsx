'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import type { Holding } from '@/types'
import { calcHoldingPnL } from '@/lib/calculations'
import { formatMoney } from '@/lib/format'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
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
  }).map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] }))

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
          <PieChart>
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0]
                const p = item.payload as { name: string; value: number; pct: number; color?: string }
                const accent = p.color || (typeof item.color === 'string' ? item.color : COLORS[0])
                return (
                  <div
                    className="min-w-[150px] rounded-xl border border-white/10 bg-[#161a23]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md"
                    style={{ boxShadow: '0 14px 30px -14px rgba(0, 0, 0, 0.65)' }}
                  >
                    <p className="font-medium text-fp-text">
                      {p.name}
                    </p>
                    <div className="mt-1.5 h-2 w-28 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: accent,
                          width: `${Math.max(10, Math.min(100, p.pct))}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-fp-muted">
                      {p.pct.toFixed(1)}% · {formatMoney(p.value, currency, usdToCad)}
                    </p>
                  </div>
                )
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="52%"
              innerRadius="45%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
              name="% of portfolio"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
