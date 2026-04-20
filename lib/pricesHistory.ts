import { getCoinGeckoId, getStockCloses } from '@/lib/prices'

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
    const bySymbol = await getStockCloses([symbol], '1day', 14, 300)
    return (bySymbol[symbol.trim().toUpperCase()] ?? []).slice(-7)
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
