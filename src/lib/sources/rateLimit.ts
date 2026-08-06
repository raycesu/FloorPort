function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function getPositiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export type RateGate = {
  run: <T>(fn: () => Promise<T>) => Promise<T>
}

/** Separate gates so one provider's 429/backoff does not block others. */
export const createRateGate = (minIntervalMs: number, maxConcurrency: number): RateGate => {
  let nextSlotAt = 0
  let active = 0
  const waiters: Array<() => void> = []

  const pump = () => {
    if (active >= maxConcurrency) return
    const wake = waiters.shift()
    wake?.()
  }

  const acquire = async () => {
    while (active >= maxConcurrency) {
      await new Promise<void>((resolve) => waiters.push(resolve))
    }
    active += 1
    const now = Date.now()
    const waitMs = Math.max(0, nextSlotAt - now)
    if (waitMs > 0) await sleep(waitMs)
    nextSlotAt = Date.now() + minIntervalMs
  }

  const release = () => {
    active -= 1
    pump()
  }

  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      await acquire()
      try {
        return await fn()
      } finally {
        release()
      }
    },
  }
}

const DEFAULT_CG_INTERVAL = getPositiveIntFromEnv('COINGECKO_MIN_REQUEST_INTERVAL_MS', 250)
const DEFAULT_CG_CONCURRENCY = getPositiveIntFromEnv('COINGECKO_HISTORY_CONCURRENCY', 4)
const DEFAULT_BN_INTERVAL = getPositiveIntFromEnv('BINANCE_MIN_REQUEST_INTERVAL_MS', 120)
const DEFAULT_BN_CONCURRENCY = getPositiveIntFromEnv('BINANCE_MAX_CONCURRENCY', 4)
const DEFAULT_CB_INTERVAL = getPositiveIntFromEnv('COINBASE_MIN_REQUEST_INTERVAL_MS', 200)
const DEFAULT_CB_CONCURRENCY = getPositiveIntFromEnv('COINBASE_MAX_CONCURRENCY', 3)

export const coingeckoGate = createRateGate(DEFAULT_CG_INTERVAL, DEFAULT_CG_CONCURRENCY)
export const binanceGate = createRateGate(DEFAULT_BN_INTERVAL, DEFAULT_BN_CONCURRENCY)
export const coinbaseGate = createRateGate(DEFAULT_CB_INTERVAL, DEFAULT_CB_CONCURRENCY)
