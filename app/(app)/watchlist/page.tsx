import { WatchlistPageClient } from './WatchlistPageClient'
import { mapRowToWatchlist } from '@/lib/mappers'
import { getLiveChangePercent, getLivePrices } from '@/lib/prices'
import { createClient } from '@/lib/supabase/server'
import type { WatchlistItem } from '@/types'

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase.from('watchlist').select('*').order('added_at', { ascending: false })

  const base: WatchlistItem[] = (rows ?? []).map((r) => mapRowToWatchlist(r as Record<string, unknown>))
  const keys = base.map((w) => ({
    id: w.id,
    symbol: w.symbol,
    asset_type: w.asset_type,
    coingecko_id: null as string | null,
  }))
  const [prices, changes] =
    keys.length > 0
      ? await Promise.all([getLivePrices(keys), getLiveChangePercent(keys)])
      : [{}, {}]

  const initialItems: WatchlistItem[] = base.map((w) => {
    const sym = w.symbol.toUpperCase()
    return {
      ...w,
      current_price: prices[w.id],
      change_24h: changes[sym],
    }
  })

  return <WatchlistPageClient initialItems={initialItems} />
}
