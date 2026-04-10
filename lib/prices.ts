import { getFiatUsdRates } from '@/lib/fx'

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
}

export function getCoinGeckoId(symbol: string): string | undefined {
  return COINGECKO_IDS[symbol.toUpperCase()]
}

export async function getCryptoPricesByCoingeckoIds(ids: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return {}
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${unique.join(',')}&vs_currencies=usd`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return {}
  const data = (await res.json()) as Record<string, { usd?: number }>
  const result: Record<string, number> = {}
  unique.forEach((id) => {
    if (data[id]?.usd != null) result[id] = data[id].usd!
  })
  return result
}

export async function getCryptoPrices(symbols: string[]): Promise<Record<string, number>> {
  const upper = symbols.map((s) => s.toUpperCase())
  const ids = upper.map((s) => COINGECKO_IDS[s]).filter(Boolean).join(',')
  if (!ids) return {}
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return {}
  const data = (await res.json()) as Record<string, { usd?: number }>
  const result: Record<string, number> = {}
  upper.forEach((symbol) => {
    const id = COINGECKO_IDS[symbol]
    if (id && data[id]?.usd != null) result[symbol] = data[id].usd!
  })
  return result
}

export type CryptoQuote = { price: number; change_24h?: number }

export async function getCryptoQuotes(symbols: string[]): Promise<Record<string, CryptoQuote>> {
  const upper = symbols.map((s) => s.toUpperCase())
  const ids = upper.map((s) => COINGECKO_IDS[s]).filter(Boolean).join(',')
  if (!ids) return {}
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return {}
  const data = (await res.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number }
  >
  const result: Record<string, CryptoQuote> = {}
  upper.forEach((symbol) => {
    const id = COINGECKO_IDS[symbol]
    if (id && data[id]?.usd != null) {
      result[symbol] = {
        price: data[id].usd!,
        change_24h: data[id].usd_24h_change,
      }
    }
  })
  return result
}

export async function getCryptoQuotesByCoingeckoIds(
  idBySymbol: Map<string, string>
): Promise<Record<string, CryptoQuote>> {
  const ids = [...new Set(idBySymbol.values())]
  if (ids.length === 0) return {}
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return {}
  const data = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>
  const result: Record<string, CryptoQuote> = {}
  idBySymbol.forEach((cgId, symbol) => {
    if (data[cgId]?.usd != null) {
      result[symbol.toUpperCase()] = {
        price: data[cgId].usd!,
        change_24h: data[cgId].usd_24h_change,
      }
    }
  })
  return result
}

export async function getStockPrices(symbols: string[]): Promise<Record<string, number>> {
  const YahooFinance = (await import('yahoo-finance2')).default
  const yahooFinance = new YahooFinance()
  const result: Record<string, number> = {}
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const quote = await yahooFinance.quote(symbol)
        const p = quote.regularMarketPrice
        if (p != null && typeof p === 'number') result[symbol.toUpperCase()] = p
      } catch (e) {
        console.error(`Failed to fetch price for ${symbol}`, e)
      }
    })
  )
  return result
}

export type PriceKey = {
  id: string
  symbol: string
  asset_type: string
  coingecko_id?: string | null
}

/** USD price per unit of the holding, keyed by holding id */
export async function getLivePrices(items: PriceKey[]): Promise<Record<string, number>> {
  const fiatRates = await getFiatUsdRates()
  const out: Record<string, number> = {}

  const cryptoByCoingecko = new Map<string, { holdingId: string; symbol: string }[]>()
  const cryptoLegacySymbols: string[] = []

  for (const h of items) {
    if (h.asset_type === 'cash') {
      const sym = h.symbol.toUpperCase()
      const rate = fiatRates[sym]
      if (rate != null) out[h.id] = rate
      continue
    }
    if (h.asset_type === 'crypto') {
      const cg = h.coingecko_id?.trim()
      if (cg) {
        const list = cryptoByCoingecko.get(cg) ?? []
        list.push({ holdingId: h.id, symbol: h.symbol })
        cryptoByCoingecko.set(cg, list)
      } else {
        cryptoLegacySymbols.push(h.symbol)
      }
    }
  }

  const stockSymbols = items.filter((h) => h.asset_type === 'stock').map((h) => h.symbol)

  const coingeckoIds = [...cryptoByCoingecko.keys()]
  const [idPrices, legacyCryptoPrices, stockPrices] = await Promise.all([
    coingeckoIds.length
      ? getCryptoPricesByCoingeckoIds(coingeckoIds)
      : Promise.resolve({} as Record<string, number>),
    cryptoLegacySymbols.length
      ? getCryptoPrices([...new Set(cryptoLegacySymbols)])
      : Promise.resolve({} as Record<string, number>),
    stockSymbols.length
      ? getStockPrices([...new Set(stockSymbols)])
      : Promise.resolve({} as Record<string, number>),
  ])

  for (const [cgId, holders] of cryptoByCoingecko) {
    const p = idPrices[cgId]
    if (p != null) {
      for (const { holdingId } of holders) out[holdingId] = p
    }
  }

  for (const h of items) {
    if (h.asset_type !== 'crypto' || h.coingecko_id) continue
    const sym = h.symbol.toUpperCase()
    const p = legacyCryptoPrices[sym]
    if (p != null) out[h.id] = p
  }

  for (const h of items) {
    if (h.asset_type !== 'stock') continue
    const p = stockPrices[h.symbol.toUpperCase()]
    if (p != null) out[h.id] = p
  }

  return out
}

/** Approximate 24h change % per symbol for dashboard performance bars */
export async function getLiveChangePercent(items: PriceKey[]): Promise<Record<string, number>> {
  const idBySymbol = new Map<string, string>()
  const legacyCryptoSymbols: string[] = []
  const stockSymbols: string[] = []

  for (const h of items) {
    if (h.asset_type === 'cash') continue
    if (h.asset_type === 'crypto') {
      const cg = h.coingecko_id?.trim()
      if (cg) idBySymbol.set(h.symbol, cg)
      else legacyCryptoSymbols.push(h.symbol)
    } else if (h.asset_type === 'stock') {
      stockSymbols.push(h.symbol)
    }
  }

  const [cgQuotes, cryptoQuotes, stockChanges] = await Promise.all([
    idBySymbol.size ? getCryptoQuotesByCoingeckoIds(idBySymbol) : Promise.resolve({}),
    legacyCryptoSymbols.length ? getCryptoQuotes([...new Set(legacyCryptoSymbols)]) : Promise.resolve({}),
    stockSymbols.length ? getStockChangePercents([...new Set(stockSymbols)]) : Promise.resolve({}),
  ])

  const out: Record<string, number> = { ...stockChanges }
  ;(Object.entries(cryptoQuotes) as [string, CryptoQuote][]).forEach(([sym, q]) => {
    if (q.change_24h != null && !Number.isNaN(q.change_24h)) out[sym] = q.change_24h
  })
  ;(Object.entries(cgQuotes) as [string, CryptoQuote][]).forEach(([sym, q]) => {
    if (q.change_24h != null && !Number.isNaN(q.change_24h)) out[sym.toUpperCase()] = q.change_24h
  })
  return out
}

async function getStockChangePercents(symbols: string[]): Promise<Record<string, number>> {
  const YahooFinance = (await import('yahoo-finance2')).default
  const yahooFinance = new YahooFinance()
  const result: Record<string, number> = {}
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const quote = await yahooFinance.quote(symbol)
        const p = quote.regularMarketChangePercent
        if (p != null && typeof p === 'number') result[symbol.toUpperCase()] = p
      } catch (e) {
        console.error(`Failed change % for ${symbol}`, e)
      }
    })
  )
  return result
}
