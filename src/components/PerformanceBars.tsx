'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { formatMoney } from '@/lib/format'
import type { PerformanceRange } from '@/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export const CHART_RANGE_OPTIONS: PerformanceRange[] = ['7D', '3M', '1Y']

function toApiRange(range: PerformanceRange) {
  return range.toLowerCase()
}

function formatXAxisLabel(timestamp: number, range: PerformanceRange) {
  const date = new Date(timestamp)
  if (range === '7D') {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric' })
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

type HistoryApiResponse = {
  series?: { timestamp: number; value: number }[]
  dataUpdatedAt?: number
  dataIsStale?: boolean
  reliable?: boolean
}

export function PerformanceBars({
  series,
  initialRange = '7D',
  title,
  description,
  apiQuery,
  dataUpdatedAt,
  dataIsStale,
  deferInitialFetch = false,
  initialReliable,
  lazyUntilVisible = false,
}: {
  series: { timestamp: number; value: number }[]
  initialRange?: PerformanceRange
  title?: string
  description?: string
  apiQuery?: Record<string, string | undefined>
  dataUpdatedAt?: number
  dataIsStale?: boolean
  /** When true, always client-fetch ranges (used for progressive chart loading). */
  deferInitialFetch?: boolean
  initialReliable?: boolean
  /** Defer all range fetches until the chart scrolls into view. */
  lazyUntilVisible?: boolean
}) {
  const { currency, usdToCad } = useDisplayCurrency()
  const chartRootRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(!lazyUntilVisible)
  const [selectedRange, setSelectedRange] = useState<PerformanceRange>(initialRange)
  const [seriesByRange, setSeriesByRange] = useState<Partial<Record<PerformanceRange, { timestamp: number; value: number }[]>>>(
    deferInitialFetch ? {} : { [initialRange]: series }
  )
  const [reliableByRange, setReliableByRange] = useState<Partial<Record<PerformanceRange, boolean>>>(
    deferInitialFetch || initialReliable == null
      ? {}
      : { [initialRange]: initialReliable }
  )
  const [loadingRange, setLoadingRange] = useState<PerformanceRange | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const [freshnessByRange, setFreshnessByRange] = useState<Partial<Record<PerformanceRange, RangeFreshness>>>({})
  const [freshnessLabel, setFreshnessLabel] = useState<string | null>(null)
  const apiQueryKey = useMemo(() => JSON.stringify(apiQuery ?? {}), [apiQuery])
  const rangeFetchDoneRef = useRef<Set<PerformanceRange>>(
    new Set(deferInitialFetch ? [] : [initialRange])
  )
  const fetchAbortRef = useRef<AbortController | null>(null)

  const CHART_FETCH_TIMEOUT_MS = 55_000

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!lazyUntilVisible) {
      setIsInView(true)
      return
    }
    const node = chartRootRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsInView(true)
      },
      { rootMargin: '120px', threshold: 0.08 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [lazyUntilVisible, apiQueryKey])

  useEffect(() => {
    if (dataUpdatedAt == null || deferInitialFetch) return
    setFreshnessByRange((prev) => ({
      ...prev,
      [initialRange]: { updatedAt: dataUpdatedAt, stale: dataIsStale ?? false },
    }))
  }, [initialRange, dataUpdatedAt, dataIsStale, deferInitialFetch])

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
    if (deferInitialFetch) {
      rangeFetchDoneRef.current = new Set()
      setSeriesByRange({})
      setReliableByRange({})
      return
    }
    rangeFetchDoneRef.current = new Set([initialRange])
    setSeriesByRange({ [initialRange]: series })
    if (initialReliable != null) {
      setReliableByRange({ [initialRange]: initialReliable })
    }
  }, [apiQueryKey, initialRange, series, deferInitialFetch, initialReliable])

  const fetchRange = useCallback(
    async (range: PerformanceRange) => {
      fetchAbortRef.current?.abort()
      const controller = new AbortController()
      fetchAbortRef.current = controller
      const timeoutId = window.setTimeout(() => controller.abort(), CHART_FETCH_TIMEOUT_MS)

      setLoadingRange(range)
      setFetchError(null)
      try {
        const params = new URLSearchParams({ range: toApiRange(range) })
        const query = JSON.parse(apiQueryKey) as Record<string, string | undefined>
        Object.entries(query).forEach(([key, value]) => {
          if (value) params.set(key, value)
        })
        const res = await fetch(`/api/portfolio-history?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(
              'Chart API not found. Stop the dev server and run npm run dev:clean (or npm run dev).'
            )
          }
          throw new Error(`Failed to load history (${res.status})`)
        }
        const json = (await res.json()) as HistoryApiResponse
        const nextSeries = json.series ?? []
        const reliable = json.reliable ?? nextSeries.length >= 2

        setSeriesByRange((prev) => ({ ...prev, [range]: nextSeries }))
        if (json.dataUpdatedAt != null) {
          setFreshnessByRange((prev) => ({
            ...prev,
            [range]: {
              updatedAt: json.dataUpdatedAt!,
              stale: json.dataIsStale ?? !reliable,
            },
          }))
        }
        setReliableByRange((prev) => ({ ...prev, [range]: reliable }))
        rangeFetchDoneRef.current.add(range)
      } catch (error) {
        if (controller.signal.aborted) {
          setFetchError('Chart request timed out. Try again or switch to a shorter range.')
        } else {
          const message = error instanceof Error ? error.message : 'Failed to load chart data'
          setFetchError(message)
        }
        setSeriesByRange((prev) => ({ ...prev, [range]: [] }))
        setReliableByRange((prev) => ({ ...prev, [range]: false }))
        rangeFetchDoneRef.current.add(range)
      } finally {
        window.clearTimeout(timeoutId)
        setLoadingRange((current) => (current === range ? null : current))
      }
    },
    [apiQueryKey]
  )

  useEffect(() => {
    if (!isInView) return
    if (rangeFetchDoneRef.current.has(selectedRange)) return
    void fetchRange(selectedRange)
  }, [apiQueryKey, selectedRange, fetchRange, isInView])

  useEffect(() => () => fetchAbortRef.current?.abort(), [])

  const data = useMemo(() => {
    const raw = [...(seriesByRange[selectedRange] ?? [])].sort((a, b) => a.timestamp - b.timestamp)
    const byTs = new Map<number, number>()
    for (const point of raw) {
      if (Number.isFinite(point.timestamp) && Number.isFinite(point.value)) {
        byTs.set(point.timestamp, point.value)
      }
    }
    return [...byTs.entries()]
      .sort(([a], [b]) => a - b)
      .map(([timestamp, value]) => ({
        timestamp,
        value,
        label: formatXAxisLabel(timestamp, selectedRange),
      }))
  }, [selectedRange, seriesByRange])

  const isReliable = reliableByRange[selectedRange] === true
  const isWaitingForView = lazyUntilVisible && !isInView
  const hasChartData = data.length >= 2
  const chartValues = data.map((d) => d.value)
  const chartMax = chartValues.length ? Math.max(...chartValues) : 0
  const chartMin = chartValues.length ? Math.min(...chartValues) : 0
  const chartRelativeSpread = chartMax > 0 ? (chartMax - chartMin) / chartMax : 0
  const isDegenerateFlat = hasChartData && chartRelativeSpread < 0.0003
  const isLoadingChart =
    isWaitingForView || (loadingRange === selectedRange && !hasChartData)

  const chartShellStyle = {
    background: '#161b24',
    border: '1px solid rgba(159,174,197,0.16)',
    color: '#8f98aa',
  }

  const rangeTabs = (
    <div
      className="inline-flex flex-wrap rounded-full p-1"
      style={{ background: '#202735', border: '1px solid rgba(159,174,197,0.12)' }}
    >
      {CHART_RANGE_OPTIONS.map((range) => {
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
            aria-pressed={active}
          >
            {range}
          </button>
        )
      })}
    </div>
  )

  if (isLoadingChart) {
    return (
      <div
        ref={chartRootRef}
        className="flex h-[380px] flex-col rounded-[24px]"
        style={chartShellStyle}
        role="status"
        aria-live="polite"
        aria-busy={!isWaitingForView}
      >
        <div
          className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
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
          {rangeTabs}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-sm">
          <p>
            {isWaitingForView
              ? 'Chart loads when you scroll here'
              : `Loading ${selectedRange} chart data…`}
          </p>
          {!isWaitingForView ? (
            <p className="text-xs" style={{ color: '#93a0b4' }}>
              {selectedRange === '7D'
                ? 'Fetching recent market history'
                : 'Longer ranges load on demand — this may take a minute'}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  if (data.length === 0 || (isDegenerateFlat && !isReliable)) {
    const handleRetryChart = () => {
      rangeFetchDoneRef.current.delete(selectedRange)
      void fetchRange(selectedRange)
    }
    return (
      <div
        ref={chartRootRef}
        className="flex h-[380px] flex-col rounded-[24px]"
        style={chartShellStyle}
      >
        <div
          className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
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
          {rangeTabs}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm">
          <p>
            {fetchError ??
              (isDegenerateFlat
                ? 'Price history did not load — chart would be misleading as a flat line.'
                : 'Portfolio trend appears here once data is available')}
          </p>
          <button
            type="button"
            onClick={handleRetryChart}
            className="rounded-full px-4 py-2 text-xs font-semibold"
            style={{ background: '#8b7ed8', color: '#ffffff' }}
            aria-label={`Retry loading ${selectedRange} chart`}
          >
            Retry chart
          </button>
          {fetchError ? (
            <p className="text-xs" style={{ color: '#93a0b4' }}>
              Check the terminal running Next.js for server errors
            </p>
          ) : null}
        </div>
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
  const minPadding = Math.max(maxValue * 0.008, spread > 0 ? spread * 0.12 : maxValue * 0.02)
  const yDomain: [number, number] = [minValue - minPadding, maxValue + minPadding]
  const badgeLabel = `${isPositive ? '+' : ''}${pct.toFixed(2)}%`

  return (
    <div
      ref={chartRootRef}
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
          {rangeTabs}
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
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  minTickGap={28}
                  tick={{ fill: '#8f98aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(ts) => formatXAxisLabel(ts as number, selectedRange)}
                />
                <YAxis
                  tick={{ fill: '#8f98aa', fontSize: 11 }}
                  domain={yDomain}
                  axisLine={false}
                  tickLine={false}
                  width={88}
                  tickFormatter={(v) => {
                    const display = (v as number) * axisDivisor
                    return `${currency === 'USD' ? '$' : 'C$'}${display.toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    })}`
                  }}
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
                  type="linear"
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
        {freshnessLabel && freshnessByRange[selectedRange] ? (
          <p className="mt-2 text-[12px]" style={{ color: '#8f98aa' }}>
            Updated {freshnessLabel}
            {freshnessByRange[selectedRange]?.stale || !isReliable ? (
              <span className="ml-1 text-[#c4a35a]" aria-label="Data may be delayed">
                · partial or delayed data
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  )
}
