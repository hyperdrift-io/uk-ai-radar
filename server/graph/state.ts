import type {
  AnalysedItem,
  Profile,
  RankedItem,
  RawItem,
} from '../utils/schemas'

/**
 * State threaded through the LangGraph pipeline.
 *
 * - `profile` is read-only input.
 * - `rawItems` / `analysedItems` / `rankedItems` are written by successive personas.
 * - `stats` accumulates run telemetry (used to prove diff-first works).
 */
export interface RadarState {
  profile: Profile
  rawItems: RawItem[]
  analysedItems: AnalysedItem[]
  rankedItems: RankedItem[]
  stats: RunStats
}

export interface RunStats {
  fetched: number
  cacheHits: number
  cacheMisses: number
  analysed: number
  ranked: number
  llmCalls: number
  startedAt: string
}

export function initialState(profile: Profile): RadarState {
  return {
    profile,
    rawItems: [],
    analysedItems: [],
    rankedItems: [],
    stats: {
      fetched: 0,
      cacheHits: 0,
      cacheMisses: 0,
      analysed: 0,
      ranked: 0,
      llmCalls: 0,
      startedAt: new Date().toISOString(),
    },
  }
}
