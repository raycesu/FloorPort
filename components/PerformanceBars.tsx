'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { formatMoney } from '@/lib/format'
import {
  Area,
  AreaChart,
  CartesianGrid,
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
      <div
        className="flex h-[380px] items-center justify-center rounded-2xl text-sm"
        style={{
          background: '#18181b',
          border: '1px solid rgba(255,255,255,0.07)',
          color: '#52525b',
        }}
      >
        24h portfolio trend appears here once data is available
      </div>
    )
  }

  const first = data[0].value
  const last = data[data.length - 1].value
  const pct = first > 0 ? ((last - first) / first) * 100 : 0
  const isPositive = pct >= 0
  const lineColor = isPositive ? '#34d399' : '#f87171'
  const gradientStartColor = isPositive ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'
  const axisDivisor = currency === 'USD' ? 1 : usdToCad
  const values = data.map((d) => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const spread = maxValue - minValue
  const padding = spread > 0 ? spread * 0.2 : Math.max(Math.abs(maxValue) * 0.02, 1)
  const yDomain: [number, number] = [minValue - padding, maxValue + padding]

  const badgeLabel = `${isPositive ? '+' : ''}${pct.toFixed(2)}%`

  return (
    <div
      className="rounded-2xl"
      style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 className="font-semibold" style={{ fontSize: '14px', color: '#e4e4e7' }}>
          24h Performance
        </h2>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
          style={
            isPositive
              ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' }
              : { background: 'rgba(239,68,68,0.12)', color: '#f87171' }
          }
        >
          {badgeLabel}
        </span>
      </div>

      <div className="p-6">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="0"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                minTickGap={32}
                tick={{ fill: '#52525b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#52525b', fontSize: 11 }}
                domain={yDomain}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  `${currency === 'USD' ? '$' : 'C$'}${Math.round((v as number) * axisDivisor).toLocaleString('en-US')}`
                }
              />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as { label: string; value: number }
                  return (
                    <div
                      className="rounded-lg px-3 py-2 text-xs"
                      style={{
                        background: '#1c1c1f',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        color: '#e4e4e7',
                      }}
                    >
                      <p className="font-medium" style={{ color: '#71717a' }}>
                        {row.label}
                      </p>
                      <p className="mt-0.5 font-semibold">
                        {formatMoney(row.value, currency, usdToCad)}
                      </p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2.5}
                fill="url(#perfGradient)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
