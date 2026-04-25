'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { calcHoldingPnL } from '@/lib/calculations'
import { formatMoney } from '@/lib/format'
import type { Holding } from '@/types'
import { Cell, Pie, PieChart, Sector, Tooltip } from 'recharts'
import { useId, useMemo, useState } from 'react'

const COLORS = ['#7c6fd4', '#34d399', '#60a5fa', '#f59e0b', '#ef4444', '#22d3ee', '#f472b6']
const OTHER_COLOR = '#64748b'

type Slice = {
  name: string
  value: number
  pct: number
  color: string
}

export function AllocationChart({ holdings }: { holdings: Holding[] }) {
  const { currency, usdToCad } = useDisplayCurrency()
  const chartId = useId().replace(/:/g, '')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const data = useMemo(() => {
    const total = holdings.reduce((sum, holding) => sum + calcHoldingPnL(holding).value, 0)
    const raw = holdings
      .map((holding) => {
        const { value } = calcHoldingPnL(holding)
        return {
          name: holding.symbol,
          value,
          pct: total > 0 ? (value / total) * 100 : 0,
        }
      })
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)

    let colorIndex = 0
    const primary = raw
      .filter((entry) => entry.pct >= 5)
      .map((entry) => ({ ...entry, color: COLORS[colorIndex++ % COLORS.length] }))
    const other = raw.filter((entry) => entry.pct < 5)
    const otherValue = other.reduce((sum, entry) => sum + entry.value, 0)
    const otherPct = other.reduce((sum, entry) => sum + entry.pct, 0)
    const slices: Slice[] =
      otherValue > 0
        ? [...primary, { name: 'Other', value: otherValue, pct: otherPct, color: OTHER_COLOR }]
        : primary

    return {
      slices,
      total,
    }
  }, [holdings])

  const totalLabel = formatMoney(data.total, currency, usdToCad)

  if (data.slices.length === 0) {
    return (
      <div
        className="flex h-[380px] items-center justify-center rounded-[24px] text-sm"
        style={{
          background: '#161b24',
          border: '1px solid rgba(159,174,197,0.16)',
          color: '#8f98aa',
        }}
      >
        Add holdings to see allocation
      </div>
    )
  }

  return (
    <div
      className="rounded-[24px]"
      style={{
        background: '#161b24',
        border: '1px solid rgba(159,174,197,0.16)',
        boxShadow: '0 18px 40px rgba(3,8,20,0.22)',
      }}
    >
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(159,174,197,0.12)' }}>
        <h2 className="font-semibold" style={{ fontSize: '15px', color: '#f5f7fb' }}>
          Asset Allocation
        </h2>
        <p className="mt-1 text-[13px]" style={{ color: '#93a0b4' }}>
          Positions under 5% are grouped into Other
        </p>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="relative mx-auto shrink-0 lg:mx-0" style={{ width: 250, height: 250 }}>
            <PieChart width={250} height={250}>
              <Tooltip
                cursor={false}
                wrapperStyle={{ zIndex: 80, outline: 'none', pointerEvents: 'none' }}
                allowEscapeViewBox={{ x: true, y: true }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as Slice
                  return (
                    <div
                      className="min-w-[170px] rounded-xl px-3 py-2 text-xs shadow-2xl"
                      style={{
                        background: '#1c2330',
                        border: '1px solid rgba(159,174,197,0.2)',
                        boxShadow: '0 14px 30px rgba(3,8,20,0.45)',
                      }}
                    >
                      <p className="font-semibold" style={{ color: '#f5f7fb' }}>
                        {p.name}
                      </p>
                      <p className="mt-1 tabular-nums" style={{ color: '#d8deea' }}>
                        {formatMoney(p.value, currency, usdToCad)}
                      </p>
                      <p className="tabular-nums" style={{ color: '#93a0b4' }}>
                        {p.pct.toFixed(1)}%
                      </p>
                    </div>
                  )
                }}
              />
              <Pie
                id={`allocation-chart-${chartId}`}
                data={data.slices}
                dataKey="value"
                nameKey="name"
                cx={125}
                cy={125}
                innerRadius={72}
                outerRadius={108}
                paddingAngle={1.5}
                cornerRadius={5}
                stroke="rgba(15,19,27,0.45)"
                strokeWidth={1}
                activeIndex={activeIndex ?? -1}
                isAnimationActive={false}
                activeShape={(props: { cx?: number; cy?: number; innerRadius?: number; outerRadius?: number; startAngle?: number; endAngle?: number; fill?: string }) => (
                  <Sector
                    cx={props.cx}
                    cy={props.cy}
                    innerRadius={props.innerRadius}
                    outerRadius={(props.outerRadius ?? 0) + 8}
                    startAngle={props.startAngle}
                    endAngle={props.endAngle}
                    fill={props.fill}
                  />
                )}
                onMouseEnter={(_, idx) => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.slices.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-medium uppercase tracking-[0.09em]" style={{ color: '#93a0b4' }}>
                Total Value
              </span>
              <span className="mt-1 text-base font-bold tabular-nums" style={{ color: '#f5f7fb' }}>
                {totalLabel}
              </span>
            </div>
          </div>

          <div className="grid w-full gap-2.5">
            {data.slices.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(159,174,197,0.12)' }}
              >
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
                <span className="min-w-0 truncate text-sm font-medium" style={{ color: '#d8deea' }} title={entry.name}>
                  {entry.name}
                </span>
                <span className="ml-auto shrink-0 text-sm tabular-nums" style={{ color: '#f5f7fb' }}>
                  {entry.pct.toFixed(1)}%
                </span>
                <span className="shrink-0 text-xs tabular-nums" style={{ color: '#93a0b4' }}>
                  {formatMoney(entry.value, currency, usdToCad)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
