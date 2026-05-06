'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { formatMoney } from '@/lib/format'
import type { PerformanceRange } from '@/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const RANGE_OPTIONS: PerformanceRange[] = ['24H', '7D', '1M', '3M', '1Y']

function toApiRange(range: PerformanceRange) {
  return range.toLowerCase()
}

function formatXAxisLabel(timestamp: number, range: PerformanceRange) {
  const date = new Date(timestamp)
  if (range === '24H') {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  if (range === '7D') {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  if (range === '1Y') {
    return date.toLocaleDateString([], { month: 'short', year: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

type RangeFreshness = { updatedAt: number; stale: boolean }

const formatFreshness = (updatedAt: number) => {
  const sec = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000))
  if (sec < 45) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

export function PerformanceBars({
  series,
  initialRange = '24H',
  title,
  description,
  apiQuery,
  dataUpdatedAt,
  dataIsStale,
}: {
  series: { timestamp: number; value: number }[]
  initialRange?: PerformanceRange
  title?: string
  description?: string
  apiQuery?: Record<string, string | undefined>
  /** Server-side fetch time (ms) for the initial range */
  dataUpdatedAt?: number
  dataIsStale?: boolean
}) {
  const { currency, usdToCad } = useDisplayCurrency()
  const [selectedRange, setSelectedRange] = useState<PerformanceRange>(initialRange)
  const [seriesByRange, setSeriesByRange] = useState<Record<PerformanceRange, { timestamp: number; value: number }[]>>({
    [initialRange]: series,
  } as Record<PerformanceRange, { timestamp: number; value: number }[]>)
  const [loadingRange, setLoadingRange] = useState<PerformanceRange | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const [freshnessByRange, setFreshnessByRange] = useState<Partial<Record<PerformanceRange, RangeFreshness>>>({})
  const [freshnessLabel, setFreshnessLabel] = useState<string | null>(null)
  const apiQueryKey = useMemo(() => JSON.stringify(apiQuery ?? {}), [apiQuery])
  /** Ranges that have finished a successful fetch (including empty series). Failed fetches are not added so user can retry by switching tabs. */
  const rangeFetchDoneRef = useRef<Set<PerformanceRange>>(new Set([initialRange]))

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (dataUpdatedAt == null) return
    setFreshnessByRange((prev) => ({
      ...prev,
      [initialRange]: { updatedAt: dataUpdatedAt, stale: dataIsStale ?? false },
    }))
  }, [initialRange, dataUpdatedAt, dataIsStale])

  useEffect(() => {
    const meta = freshnessByRange[selectedRange]
    if (!meta) {
      setFreshnessLabel(null)
      return
    }
    const tick = () => setFreshnessLabel(formatFreshness(meta.updatedAt))
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [selectedRange, freshnessByRange])

  useEffect(() => {
    rangeFetchDoneRef.current = new Set([initialRange])
    setSeriesByRange({ [initialRange]: series } as Record<PerformanceRange, { timestamp: number; value: number }[]>)
  }, [apiQueryKey, initialRange, series])

  useEffect(() => {
    if (rangeFetchDoneRef.current.has(selectedRange)) return

    let cancelled = false
    async function load() {
      setLoadingRange(selectedRange)
      try {
        const params = new URLSearchParams({ range: toApiRange(selectedRange) })
        const query = JSON.parse(apiQueryKey) as Record<string, string | undefined>
        Object.entries(query).forEach(([key, value]) => {
          if (value) params.set(key, value)
        })
        const res = await fetch(`/api/portfolio-history?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load history')
        const json = (await res.json()) as {
          series?: { timestamp: number; value: number }[]
          dataUpdatedAt?: number
          dataIsStale?: boolean
        }
        if (!cancelled) {
          const nextSeries = json.series ?? []
          setSeriesByRange((prev) => ({
            ...prev,
            [selectedRange]: nextSeries,
          }))
          if (json.dataUpdatedAt != null) {
            setFreshnessByRange((prev) => ({
              ...prev,
              [selectedRange]: { updatedAt: json.dataUpdatedAt!, stale: json.dataIsStale ?? false },
            }))
          }
          rangeFetchDoneRef.current.add(selectedRange)
        }
      } catch {
        if (!cancelled) {
          setSeriesByRange((prev) => ({ ...prev, [selectedRange]: [] }))
        }
      } finally {
        if (!cancelled) setLoadingRange(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [apiQueryKey, selectedRange])

  const data = useMemo(
    () =>
      (seriesByRange[selectedRange] ?? []).map((point) => ({
        ...point,
        label: formatXAxisLabel(point.timestamp, selectedRange),
      })),
    [selectedRange, seriesByRange]
  )

  if (data.length === 0 && loadingRange == null) {
    return (
      <div
        className="flex h-[380px] items-center justify-center rounded-[24px] text-sm"
        style={{
          background: '#161b24',
          border: '1px solid rgba(159,174,197,0.16)',
          color: '#8f98aa',
        }}
      >
        Portfolio trend appears here once data is available
      </div>
    )
  }

  const first = data[0]?.value ?? 0
  const last = data[data.length - 1]?.value ?? first
  const pct = first > 0 ? ((last - first) / first) * 100 : 0
  const isPositive = pct >= 0
  const lineColor = isPositive ? '#57d9aa' : '#f3797d'
  const axisDivisor = currency === 'USD' ? 1 : usdToCad
  const values = data.map((d) => d.value)
  const minValue = values.length ? Math.min(...values) : 0
  const maxValue = values.length ? Math.max(...values) : 0
  const spread = maxValue - minValue
  const padding = spread > 0 ? spread * 0.18 : Math.max(Math.abs(maxValue) * 0.02, 1)
  const yDomain: [number, number] = [minValue - padding, maxValue + padding]
  const badgeLabel = `${isPositive ? '+' : ''}${pct.toFixed(2)}%`

  return (
    <div
      className="flex h-full min-w-0 flex-col rounded-[24px]"
      style={{
        background: '#161b24',
        border: '1px solid rgba(159,174,197,0.16)',
        boxShadow: '0 18px 40px rgba(3,8,20,0.22)',
      }}
    >
      <div
        className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
        style={{ borderBottom: '1px solid rgba(159,174,197,0.12)' }}
      >
        <div className="space-y-1">
          <h2 className="font-semibold" style={{ fontSize: '15px', color: '#f5f7fb' }}>
            {title ?? `${selectedRange} Performance`}
          </h2>
          <p className="text-[13px]" style={{ color: '#93a0b4' }}>
            {description ?? 'Portfolio value across the selected range'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold tabular-nums"
            style={
              isPositive
                ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' }
                : { background: 'rgba(243,121,125,0.12)', color: '#f3797d' }
            }
          >
            {badgeLabel}
          </span>
          <div
            className="inline-flex flex-wrap rounded-full p-1"
            style={{ background: '#202735', border: '1px solid rgba(159,174,197,0.12)' }}
          >
            {RANGE_OPTIONS.map((range) => {
              const active = range === selectedRange
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setSelectedRange(range)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={
                    active
                      ? { background: '#8b7ed8', color: '#ffffff' }
                      : { color: '#aeb8c9' }
                  }
                >
                  {range}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="h-[280px] w-full flex-1 md:h-[300px]">
          {hasMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: 6, right: 6, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="rgba(159,174,197,0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  minTickGap={28}
                  tick={{ fill: '#8f98aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8f98aa', fontSize: 11 }}
                  domain={yDomain}
                  axisLine={false}
                  tickLine={false}
                  width={84}
                  tickFormatter={(v) =>
                    `${currency === 'USD' ? '$' : 'C$'}${Math.round((v as number) * axisDivisor).toLocaleString('en-US')}`
                  }
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(159,174,197,0.16)', strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0].payload as { label: string; value: number }
                    return (
                      <div
                        className="rounded-xl px-3 py-2 text-xs"
                        style={{
                          background: '#1c2330',
                          border: '1px solid rgba(159,174,197,0.14)',
                          boxShadow: '0 12px 30px rgba(3,8,20,0.35)',
                          color: '#f5f7fb',
                        }}
                      >
                        <p className="font-medium" style={{ color: '#93a0b4' }}>
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
                  strokeWidth={2.75}
                  fill="url(#perfGradient)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
        {loadingRange ? (
          <p className="mt-4 text-[12px]" style={{ color: '#93a0b4' }}>
            Loading {loadingRange} history...
          </p>
        ) : null}
        {freshnessLabel && freshnessByRange[selectedRange] ? (
          <p className="mt-2 text-[12px]" style={{ color: '#8f98aa' }}>
            Updated {freshnessLabel}
            {freshnessByRange[selectedRange]?.stale ? (
              <span className="ml-1 text-[#c4a35a]" aria-label="Data may be delayed">
                · delayed feed
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  )
}
