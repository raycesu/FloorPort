/** USD per 1 unit of fiat (e.g. 1 CAD = how many USD). Cached per request via Next fetch. */
export type FiatUsdRates = Record<string, number>

const FRANKFURTER = 'https://api.frankfurter.app/latest?from=USD'

export async function getUsdToCad(): Promise<number> {
  const res = await fetch(`${FRANKFURTER}&to=CAD`, { next: { revalidate: 3600 } })
  if (!res.ok) return 1.35
  const data = (await res.json()) as { rates?: { CAD?: number } }
  const cad = data.rates?.CAD
  return cad != null && cad > 0 ? cad : 1.35
}

/** USD value of 1 unit of each supported fiat (USD => 1). */
export async function getFiatUsdRates(): Promise<FiatUsdRates> {
  const res = await fetch(`${FRANKFURTER}&to=CAD,EUR,GBP`, { next: { revalidate: 3600 } })
  const fallback: FiatUsdRates = { USD: 1, CAD: 1 / 1.35, EUR: 1.08, GBP: 1.27 }
  if (!res.ok) return fallback
  const data = (await res.json()) as { rates?: Record<string, number> }
  const r = data.rates ?? {}
  const usdPerCad = r.CAD && r.CAD > 0 ? 1 / r.CAD : fallback.CAD
  const usdPerEur = r.EUR && r.EUR > 0 ? 1 / r.EUR : fallback.EUR
  const usdPerGbp = r.GBP && r.GBP > 0 ? 1 / r.GBP : fallback.GBP
  return {
    USD: 1,
    CAD: usdPerCad,
    EUR: usdPerEur,
    GBP: usdPerGbp,
  }
}

export function convertUsdToDisplay(usdAmount: number, currency: 'USD' | 'CAD', usdToCad: number): number {
  if (currency === 'USD') return usdAmount
  return usdAmount * usdToCad
}
