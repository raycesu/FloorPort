'use client'

import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

export function PriceChart({
  symbol,
  assetType,
  compact = false,
}: {
  symbol: string
  assetType: 'crypto' | 'stock'
  compact?: boolean
}) {
  const [points, setPoints] = useState<number[] | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(
          `/api/history?symbol=${encodeURIComponent(symbol)}&asset_type=${assetType}`
        )
        if (!res.ok) throw new Error('bad')
        const json = (await res.json()) as { data?: number[] }
        if (!cancelled) setPoints(json.data ?? [])
      } catch {
        if (!cancelled) {
          setErr(true)
          setPoints([])
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [symbol, assetType])

  if (points === null) {
    return (
      <div
        className={`animate-pulse rounded bg-[#0d0d0f] ${compact ? 'h-7 w-10' : ''}`}
        style={compact ? undefined : { width: 80, height: 32 }}
      />
    )
  }
  if (err || points.length === 0) {
    return (
      <span
        className={`tabular-nums ${compact ? 'text-xs' : 'text-[13px]'}`}
        style={{ color: '#3f3f46' }}
      >
        —
      </span>
    )
  }

  const chartData = points.map((y, i) => ({ i, y }))
  const min = Math.min(...points)
  const max = Math.max(...points)
  const flat = min === max
  const first = points[0]
  const last = points[points.length - 1]
  const strokeColor = flat
    ? '#71717a'
    : last >= first
      ? '#4ade80'
      : '#f87171'

  return (
    <div className={compact ? 'h-7 w-10' : ''} style={compact ? undefined : { width: 80, height: 32 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis domain={flat ? [min - 1, max + 1] : ['auto', 'auto']} hide />
          <Tooltip
            contentStyle={{
              background: '#1c1c1f',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 11,
              color: '#e4e4e7',
            }}
            formatter={(v: number) => [v.toFixed(2), '']}
          />
          <Line type="monotone" dataKey="y" stroke={strokeColor} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
