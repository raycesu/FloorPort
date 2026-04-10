'use client'

import { contrastTextForBackground } from '@/lib/contrastText'
import type { Holding } from '@/types'
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

export function PerformanceBars({
  holdings,
  changeBySymbol,
}: {
  holdings: Holding[]
  changeBySymbol: Record<string, number>
}) {
  const data = holdings
    .filter((h) => h.asset_type !== 'cash')
    .map((h) => {
      const sym = h.symbol.toUpperCase()
      const change = changeBySymbol[sym] ?? 0
      return { name: sym, change }
    })

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-white/10 bg-fp-surface text-sm text-zinc-500">
        24h change appears here once you add holdings
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-fp-surface p-4 backdrop-blur">
      <h2 className="mb-4 text-sm font-semibold text-zinc-300">24h performance</h2>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0]
                const row = item.payload as { name: string; change: number }
                const bg =
                  typeof item.color === 'string'
                    ? item.color
                    : row.change >= 0
                      ? '#4ade80'
                      : '#f87171'
                const fg = contrastTextForBackground(bg)
                const v = row.change
                return (
                  <div
                    className="rounded-lg px-3 py-2 text-xs shadow-lg ring-1 ring-black/20"
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    <p className="font-medium" style={{ color: fg }}>
                      {row.name}
                    </p>
                    <p className="opacity-90" style={{ color: fg }}>
                      24h: {v >= 0 ? '+' : ''}
                      {v.toFixed(2)}%
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="change" radius={[4, 4, 0, 0]} name="24h %">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.change >= 0 ? '#4ade80' : '#f87171'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
