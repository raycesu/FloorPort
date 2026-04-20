import { createClient } from '@/lib/supabase/server'
import { searchStockSymbols } from '@/lib/prices'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Result = { symbol: string; name: string; type: 'crypto' | 'stock'; coingecko_id?: string }

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  const type = new URL(request.url).searchParams.get('type')
  if (q.length < 1 || (type !== 'stock' && type !== 'crypto')) {
    return NextResponse.json({ error: 'q and type (crypto|stock) required' }, { status: 400 })
  }

  const results: Result[] = []

  if (type === 'stock') {
    try {
      if (q.length < 2) return NextResponse.json({ results: [] })
      const stocks = await searchStockSymbols(q, 12)
      stocks.forEach((row) => {
        results.push({
          symbol: row.symbol,
          name: row.name,
          type: 'stock',
        })
      })
    } catch (e) {
      console.error('Twelve Data search failed', e)
    }
  }

  if (type === 'crypto') {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
        { next: { revalidate: 300 } }
      )
      if (res.ok) {
        const data = (await res.json()) as {
          coins?: { id: string; name: string; symbol: string }[]
        }
        const coins = data.coins ?? []
        for (const c of coins.slice(0, 15)) {
          if (!c?.id || !c?.symbol) continue
          results.push({
            symbol: String(c.symbol).toUpperCase(),
            name: c.name ?? c.symbol,
            type: 'crypto',
            coingecko_id: c.id,
          })
        }
      }
    } catch (e) {
      console.error('CoinGecko search failed', e)
    }
  }

  return NextResponse.json({ results: results.slice(0, 20) })
}
