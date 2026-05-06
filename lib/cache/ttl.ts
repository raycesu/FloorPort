function getPositiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

/** Spot / simple quote */
export const TTL_QUOTE_SOFT_MS = getPositiveIntFromEnv('PRICE_CACHE_SOFT_TTL_MS_QUOTE', 60_000)
export const TTL_QUOTE_HARD_MS = getPositiveIntFromEnv('PRICE_CACHE_HARD_TTL_MS_QUOTE', 6 * 60 * 60 * 1000)

/** 24H chart */
export const TTL_CHART_24H_SOFT_MS = getPositiveIntFromEnv('PRICE_CACHE_SOFT_TTL_MS_CHART_24H', 10 * 60 * 1000)
export const TTL_CHART_24H_HARD_MS = getPositiveIntFromEnv('PRICE_CACHE_HARD_TTL_MS_CHART_24H', 24 * 60 * 60 * 1000)

/** 7D chart */
export const TTL_CHART_7D_SOFT_MS = getPositiveIntFromEnv('PRICE_CACHE_SOFT_TTL_MS_CHART_7D', 60 * 60 * 1000)
export const TTL_CHART_7D_HARD_MS = getPositiveIntFromEnv('PRICE_CACHE_HARD_TTL_MS_CHART_7D', 3 * 24 * 60 * 60 * 1000)

/** 1M / 3M / 1Y chart */
export const TTL_CHART_LONG_SOFT_MS = getPositiveIntFromEnv('PRICE_CACHE_SOFT_TTL_MS_CHART_LONG', 6 * 60 * 60 * 1000)
export const TTL_CHART_LONG_HARD_MS = getPositiveIntFromEnv('PRICE_CACHE_HARD_TTL_MS_CHART_LONG', 7 * 24 * 60 * 60 * 1000)

/** FX */
export const TTL_FX_SOFT_MS = getPositiveIntFromEnv('PRICE_CACHE_SOFT_TTL_MS_FX', 5 * 60 * 1000)
export const TTL_FX_HARD_MS = getPositiveIntFromEnv('PRICE_CACHE_HARD_TTL_MS_FX', 24 * 60 * 60 * 1000)

/** Batched 7d change (coins/markets) */
export const TTL_CHANGE_7D_SOFT_MS = getPositiveIntFromEnv('PRICE_CACHE_SOFT_TTL_MS_CHANGE_7D', 60 * 60 * 1000)
export const TTL_CHANGE_7D_HARD_MS = getPositiveIntFromEnv('PRICE_CACHE_HARD_TTL_MS_CHANGE_7D', 24 * 60 * 60 * 1000)

export const chartTtlForRange = (range: '24h' | '7d' | '1m' | '3m' | '1y'): { soft: number; hard: number } => {
  if (range === '24h') return { soft: TTL_CHART_24H_SOFT_MS, hard: TTL_CHART_24H_HARD_MS }
  if (range === '7d') return { soft: TTL_CHART_7D_SOFT_MS, hard: TTL_CHART_7D_HARD_MS }
  return { soft: TTL_CHART_LONG_SOFT_MS, hard: TTL_CHART_LONG_HARD_MS }
}
