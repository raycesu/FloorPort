import { normalizeToBucketPoints } from '@/lib/sources/chartUtils'
import type { TimePricePoint } from '@/lib/sources/types'

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

const SUPPORTED_FIAT_HISTORY = new Set(['CAD', 'EUR', 'GBP'])

/** Historical USD value of 1 unit of fiat, aligned to chart buckets. */
export async function getFiatUsdHistoryByCurrency(
  currencies: string[],
  bucketTimestamps: number[]
): Promise<Record<string, TimePricePoint[]>> {
  const unique = [...new Set(currencies.map((c) => c.toUpperCase()).filter((c) => SUPPORTED_FIAT_HISTORY.has(c)))]
  if (unique.length === 0 || bucketTimestamps.length === 0) return {}

  const sortedBuckets = [...bucketTimestamps].sort((a, b) => a - b)
  const start = new Date(sortedBuckets[0])
  const end = new Date(sortedBuckets[sortedBuckets.length - 1])
  const startIso = start.toISOString().slice(0, 10)
  const endIso = end.toISOString().slice(0, 10)
  const out: Record<string, TimePricePoint[]> = {}

  await Promise.all(
    unique.map(async (currency) => {
      const url = `https://api.frankfurter.app/${startIso}..${endIso}?from=USD&to=${currency}`
      try {
        const res = await fetch(url, { next: { revalidate: 3600 } })
        if (!res.ok) return
        const data = (await res.json()) as { rates?: Record<string, Record<string, number>> }
        const daily = data.rates ?? {}
        const raw: TimePricePoint[] = []
        for (const [day, rates] of Object.entries(daily)) {
          const perUsd = rates[currency]
          if (perUsd == null || perUsd <= 0) continue
          const usdPerUnit = 1 / perUsd
          const ts = Date.parse(`${day}T12:00:00Z`)
          if (!Number.isFinite(ts)) continue
          raw.push({ timestamp: ts, price: usdPerUnit })
        }
        raw.sort((a, b) => a.timestamp - b.timestamp)
        if (raw.length >= 2) {
          out[currency] = normalizeToBucketPoints(raw, sortedBuckets)
        }
      } catch {
        /* spot fallback in portfolio series */
      }
    })
  )

  return out
}
