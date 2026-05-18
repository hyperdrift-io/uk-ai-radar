import { analyst } from './personas/analyst'
import { editor } from './personas/editor'
import { evaluator } from './personas/evaluator'
import { scout } from './personas/scout'
import { strategist } from './personas/strategist'
import { initialState, type RadarState } from './state'
import type { Profile } from '../utils/schemas'

/**
 * Run the radar pipeline once for a profile.
 *
 * Currently linear: Scout → Analyst → Strategist → Editor.
 *
 * Each persona is a pure async function `(state) => Promise<Partial<state>>`.
 * When v2 introduces branching personas (Lawyer / Lobbyist / Archivist) we will
 * swap this orchestrator for a LangGraph StateGraph without touching the personas.
 */
export async function runRadar(profile: Profile): Promise<RadarState> {
  let state = initialState(profile)
  state = merge(state, await scout(state))

  if (state.rawItems.length === 0) {
    console.log('[radar] no items fetched from any source — check connectivity')
    return state
  }

  state = merge(state, await analyst(state))
  state = merge(state, await strategist(state))
  state = merge(state, editor(state))
  state = merge(state, evaluator(state))
  return state
}

function merge(prev: RadarState, patch: Partial<RadarState>): RadarState {
  return { ...prev, ...patch }
}
