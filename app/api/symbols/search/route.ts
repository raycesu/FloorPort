import { createClient } from '@/lib/supabase/server'
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
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`
      const res = await fetch(url, { next: { revalidate: 300 }, headers: { 'User-Agent': 'FloorPort/1.0' } })
      if (res.ok) {
        const data = (await res.json()) as {
          quotes?: {
            symbol?: string
            shortname?: string
            longname?: string
            quoteType?: string
          }[]
        }
        const quotes = data.quotes ?? []
        for (const row of quotes) {
          const sym = row.symbol
          if (!sym || typeof sym !== 'string') continue
          const qt = row.quoteType ?? ''
          if (qt && qt !== 'EQUITY' && qt !== 'ETF') continue
          const name = row.shortname ?? row.longname ?? sym
          results.push({
            symbol: sym.toUpperCase(),
            name: typeof name === 'string' ? name : sym,
            type: 'stock',
          })
        }
      }
    } catch (e) {
      console.error('Yahoo search failed', e)
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
