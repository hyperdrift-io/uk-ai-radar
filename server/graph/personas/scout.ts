import { scoutGovUk } from '../../sources/govuk'
import { scoutParliament } from '../../sources/parliament'
import { scoutUkri } from '../../sources/ukri'
import type { RadarState } from '../state'

/**
 * Scout — fan out to all whitelisted sources in parallel, diff each response
 * against the SQLite page-hash cache, forward only new or changed items.
 *
 * Each source adapter returns `{ items, fetched, cacheHits, cacheMisses }`.
 * Adding a v2 source = drop a new adapter + add it to the Promise.all here.
 */
export async function scout(state: RadarState): Promise<Partial<RadarState>> {
  const results = await Promise.all([scoutGovUk(), scoutUkri(), scoutParliament()])

  const items = results.flatMap((r) => r.items)
  const fetched = results.reduce((n, r) => n + r.fetched, 0)
  const cacheHits = results.reduce((n, r) => n + r.cacheHits, 0)
  const cacheMisses = results.reduce((n, r) => n + r.cacheMisses, 0)

  const stats = {
    ...state.stats,
    fetched: state.stats.fetched + fetched,
    cacheHits: state.stats.cacheHits + cacheHits,
    cacheMisses: state.stats.cacheMisses + cacheMisses,
  }

  console.log(`[scout] fetched=${fetched} cacheHits=${cacheHits} new=${items.length}`)
  return { rawItems: items, stats }
}
