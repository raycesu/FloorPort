import { getCoinGeckoId } from '@/lib/prices'

/** Last 7 daily closes (oldest → newest), up to 7 points */
export async function getCryptoHistory7d(symbol: string): Promise<number[]> {
  const id = getCoinGeckoId(symbol)
  if (!id) return []
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7&interval=daily`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) return []
  const data = (await res.json()) as { prices?: [number, number][] }
  const prices = data.prices?.map(([, p]) => p) ?? []
  return prices.slice(-7)
}

export async function getStockHistory7d(symbol: string): Promise<number[]> {
  try {
    const u = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=7d`
    const res = await fetch(u, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'FloorPort/1.0' },
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      chart?: {
        result?: {
          timestamp?: number[]
          indicators?: { quote?: { close?: (number | null)[] }[] }
        }[]
      }
    }
    const result = data.chart?.result?.[0]
    const closes = result?.indicators?.quote?.[0]?.close ?? []
    return closes.filter((c): c is number => c != null && !Number.isNaN(c)).slice(-7)
  } catch (e) {
    console.error(`Failed history for ${symbol}`, e)
    return []
  }
}

export async function getSparkline7d(
  symbol: string,
  assetType: 'crypto' | 'stock'
): Promise<number[]> {
  if (assetType === 'crypto') return getCryptoHistory7d(symbol)
  return getStockHistory7d(symbol)
}
