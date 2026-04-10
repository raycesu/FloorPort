'use client'

import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

export function PriceChart({
  symbol,
  assetType,
}: {
  symbol: string
  assetType: 'crypto' | 'stock'
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
    return <div className="h-10 w-28 animate-pulse rounded bg-white/10" />
  }
  if (err || points.length === 0) {
    return <span className="text-xs text-zinc-600">—</span>
  }

  const chartData = points.map((y, i) => ({ i, y }))
  const min = Math.min(...points)
  const max = Math.max(...points)
  const flat = min === max

  return (
    <div className="h-10 w-32">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis domain={flat ? [min - 1, max + 1] : ['auto', 'auto']} hide />
          <Tooltip
            contentStyle={{
              background: '#1a1a24',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 11,
            }}
            formatter={(v: number) => [v.toFixed(2), '']}
          />
          <Line type="monotone" dataKey="y" stroke="#a89cf7" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
