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
  const data = holdings
    .map((h) => {
      const { value } = calcHoldingPnL(h)
      return {
        name: h.symbol,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
      }
    })
    .map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] }))

  const totalLabel = formatMoney(total, currency, usdToCad)

  if (data.length === 0) {
    return (
      <div
        className="flex h-[380px] items-center justify-center rounded-2xl text-sm"
        style={{
          background: '#18181b',
          border: '1px solid rgba(255,255,255,0.07)',
          color: '#52525b',
        }}
      >
        Add holdings to see allocation
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl"
      style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Card header */}
      <div
        className="px-6 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 className="font-semibold" style={{ fontSize: '14px', color: '#e4e4e7' }}>
          Allocation
        </h2>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Donut chart */}
          <div className="relative mx-auto h-[220px] w-[220px] shrink-0 md:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const item = payload[0]
                    const p = item.payload as {
                      name: string
                      value: number
                      pct: number
                      color?: string
                    }
                    const accent =
                      p.color || (typeof item.color === 'string' ? item.color : COLORS[0])
                    return (
                      <div
                        className="min-w-[150px] rounded-xl px-3 py-2 text-xs shadow-2xl"
                        style={{
                          background: '#1c1c1f',
                          border: '1px solid rgba(255,255,255,0.1)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        }}
                      >
                        <p className="font-medium" style={{ color: '#e4e4e7' }}>
                          {p.name}
                        </p>
                        <div className="mt-1.5 h-1.5 w-28 rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: accent,
                              width: `${Math.max(8, Math.min(100, p.pct))}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1.5" style={{ color: '#52525b' }}>
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
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-medium uppercase tracking-[0.08em]" style={{ color: '#52525b' }}>
                Total
              </span>
              <span className="mt-0.5 text-sm font-bold tabular-nums" style={{ color: '#e4e4e7' }}>
                {totalLabel}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2.5">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: entry.color }}
                />
                <span
                  className="truncate text-xs font-medium"
                  style={{ color: '#a1a1aa' }}
                  title={entry.name}
                >
                  {entry.name}
                </span>
                <span className="ml-auto shrink-0 text-xs tabular-nums" style={{ color: '#52525b' }}>
                  {entry.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
