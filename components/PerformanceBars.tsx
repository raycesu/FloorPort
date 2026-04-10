'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { formatMoney } from '@/lib/format'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export function PerformanceBars({
  series,
}: {
  series: { timestamp: number; value: number }[]
}) {
  const { currency, usdToCad } = useDisplayCurrency()
  const data = series.map((p) => ({
    ...p,
    label: new Date(p.timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    }),
  }))

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-fp-border bg-fp-surface text-sm text-fp-muted">
        24h portfolio trend appears here once data is available
      </div>
    )
  }

  const first = data[0].value
  const last = data[data.length - 1].value
  const pct = first > 0 ? ((last - first) / first) * 100 : 0
  const stroke = pct >= 0 ? '#1a9e6e' : '#e03e3e'
  const axisDivisor = currency === 'USD' ? 1 : usdToCad
  const values = data.map((d) => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const spread = maxValue - minValue
  const padding = spread > 0 ? spread * 0.2 : Math.max(Math.abs(maxValue) * 0.02, 1)
  const yDomain: [number, number] = [minValue - padding, maxValue + padding]

  return (
    <div className="rounded-xl border border-fp-border bg-fp-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-fp-text">24h performance</h2>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e6" />
            <XAxis dataKey="label" minTickGap={32} tick={{ fill: '#6b6b6b', fontSize: 11 }} />
            <YAxis
              tick={{ fill: '#6b6b6b', fontSize: 11 }}
              domain={yDomain}
              tickFormatter={(v) =>
                `${currency === 'USD' ? '$' : 'C$'}${Math.round((v as number) * axisDivisor).toLocaleString('en-US')}`
              }
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const row = payload[0].payload as { label: string; value: number }
                return (
                  <div className="rounded-lg border border-fp-border bg-fp-surface px-3 py-2 text-xs text-fp-text">
                    <p className="font-medium">{row.label}</p>
                    <p className="opacity-90">{formatMoney(row.value, currency, usdToCad)}</p>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className={`mt-2 text-xs ${pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        24h: {pct >= 0 ? '+' : ''}
        {pct.toFixed(2)}%
      </p>
    </div>
  )
}
