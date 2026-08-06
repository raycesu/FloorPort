import {
  recordCacheFailureStale,
  recordCacheHardMiss,
  recordCacheHit,
  recordCacheBypassLocal,
  recordCacheSoftStale,
} from '@/lib/cache/cacheStats'
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'

export type CacheFetchResult<T> = {
  value: T
  fetchedAt: number
  isStale: boolean
}

type FetcherOutcome<T> = { value: T; status: number | null }

type LocalRow = {
  value: unknown
  fetchedAt: number
  softExpiresAt: number
  hardExpiresAt: number
}

const localRowByKey = new Map<string, LocalRow>()
const inFlight = new Map<string, Promise<unknown>>()

export type GetOrComputeOptions<T> = {
  key: string
  softTtlMs: number
  hardTtlMs: number
  source?: string
  fetcher: () => Promise<FetcherOutcome<T>>
  /** When false, failed/empty fetches are not written to price_cache (avoids sticky empty chart rows). */
  shouldPersist?: (value: T) => boolean
}

const readLocal = (key: string): LocalRow | null => {
  const row = localRowByKey.get(key)
  if (!row) return null
  return row
}

const writeLocal = (key: string, value: unknown, softExpiresAt: number, hardExpiresAt: number, fetchedAt: number) => {
  localRowByKey.set(key, { value, fetchedAt, softExpiresAt, hardExpiresAt })
}

async function readDbRow(key: string): Promise<LocalRow | null> {
  const supa = createServiceRoleClient()
  if (!supa) return null
  const { data, error } = await supa.from('price_cache').select('*').eq('key', key).maybeSingle()
  if (error || !data) return null
  const wrapped = data.value as { data?: unknown } | null
  const value = wrapped?.data
  const fetchedAt = new Date(String(data.fetched_at)).getTime()
  const softExpiresAt = new Date(String(data.soft_expires_at)).getTime()
  const hardExpiresAt = new Date(String(data.hard_expires_at)).getTime()
  if (!Number.isFinite(fetchedAt)) return null
  writeLocal(key, value, softExpiresAt, hardExpiresAt, fetchedAt)
  return { value, fetchedAt, softExpiresAt, hardExpiresAt }
}

async function writeDbRow(
  key: string,
  value: unknown,
  fetchedAtMs: number,
  softTtlMs: number,
  hardTtlMs: number,
  status: number | null,
  source: string
) {
  const softExpiresAt = fetchedAtMs + softTtlMs
  const hardExpiresAt = fetchedAtMs + hardTtlMs
  writeLocal(key, value, softExpiresAt, hardExpiresAt, fetchedAtMs)

  const supa = createServiceRoleClient()
  if (!supa) {
    recordCacheBypassLocal()
    return
  }
  const payload = { data: value }
  await supa.from('price_cache').upsert({
    key,
    value: payload,
    fetched_at: new Date(fetchedAtMs).toISOString(),
    soft_expires_at: new Date(softExpiresAt).toISOString(),
    hard_expires_at: new Date(hardExpiresAt).toISOString(),
    last_status: status,
    source,
  })
}

async function readRow(key: string): Promise<LocalRow | null> {
  const mem = readLocal(key)
  if (mem) return mem
  return readDbRow(key)
}

const blockingRefresh = async <T>(
  key: string,
  softTtlMs: number,
  hardTtlMs: number,
  source: string,
  fetcher: () => Promise<FetcherOutcome<T>>,
  shouldPersist?: (value: T) => boolean
): Promise<CacheFetchResult<T>> => {
  recordCacheHardMiss()
  try {
    const outcome = await fetcher()
    const now = Date.now()
    if (shouldPersist == null || shouldPersist(outcome.value)) {
      await writeDbRow(key, outcome.value, now, softTtlMs, hardTtlMs, outcome.status, source)
    }
    return { value: outcome.value, fetchedAt: now, isStale: false }
  } catch {
    const row = await readRow(key)
    if (row && row.hardExpiresAt > Date.now()) {
      recordCacheFailureStale()
      return {
        value: row.value as T,
        fetchedAt: row.fetchedAt,
        isStale: true,
      }
    }
    throw new Error(`price_cache miss and fetch failed for ${key}`)
  }
}

const fireAndForgetRefresh = <T>(
  key: string,
  softTtlMs: number,
  hardTtlMs: number,
  source: string,
  fetcher: () => Promise<FetcherOutcome<T>>,
  shouldPersist?: (value: T) => boolean
) => {
  void (async () => {
    try {
      const outcome = await fetcher()
      const now = Date.now()
      if (shouldPersist == null || shouldPersist(outcome.value)) {
        await writeDbRow(key, outcome.value, now, softTtlMs, hardTtlMs, outcome.status, source)
      }
    } catch {
      /* keep stale row */
    }
  })()
}

export async function getOrCompute<T>(options: GetOrComputeOptions<T>): Promise<CacheFetchResult<T>> {
  const { key, softTtlMs, hardTtlMs, source = 'unknown', fetcher, shouldPersist } = options
  const existingFlight = inFlight.get(key) as Promise<CacheFetchResult<T>> | undefined
  if (existingFlight) return existingFlight

  const isPersistable = (value: unknown) => (shouldPersist == null ? true : shouldPersist(value as T))

  const run = (async () => {
    const now = Date.now()
    const row = await readRow(key)
    const rowValue = row?.value
    const rowIsUsable = row != null && isPersistable(rowValue)

    if (row && rowIsUsable && now < row.softExpiresAt) {
      recordCacheHit()
      return { value: row.value as T, fetchedAt: row.fetchedAt, isStale: false }
    }

    if (row && rowIsUsable && now < row.hardExpiresAt) {
      recordCacheSoftStale()
      fireAndForgetRefresh(key, softTtlMs, hardTtlMs, source, fetcher, shouldPersist)
      return { value: row.value as T, fetchedAt: row.fetchedAt, isStale: true }
    }

    return blockingRefresh(key, softTtlMs, hardTtlMs, source, fetcher, shouldPersist)
  })()

  inFlight.set(key, run)
  try {
    return await run
  } finally {
    inFlight.delete(key)
  }
}
