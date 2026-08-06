export type CacheStatSnapshot = {
  hits: number
  softStaleServed: number
  hardMiss: number
  failureStale: number
  bypassLocal: number
}

const stats: CacheStatSnapshot = {
  hits: 0,
  softStaleServed: 0,
  hardMiss: 0,
  failureStale: 0,
  bypassLocal: 0,
}

export const recordCacheHit = () => {
  stats.hits += 1
}

export const recordCacheSoftStale = () => {
  stats.softStaleServed += 1
}

export const recordCacheHardMiss = () => {
  stats.hardMiss += 1
}

export const recordCacheFailureStale = () => {
  stats.failureStale += 1
}

export const recordCacheBypassLocal = () => {
  stats.bypassLocal += 1
}

export const getCacheStatsSnapshot = (): CacheStatSnapshot => ({ ...stats })
