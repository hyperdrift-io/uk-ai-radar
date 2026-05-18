import type { RankedItem } from '../../utils/schemas'
import type { RadarState } from '../state'

const FIT_FLOOR = 0.25
const MAX_ITEMS = 15

/**
 * Deterministic ranking:
 *
 *   composite = 0.55 * fit + 0.30 * actionability + 0.15 * deadlineUrgency
 *
 * deadlineUrgency:
 *   - 1.0 if deadline within 14 days
 *   - 0.7 if within 30 days
 *   - 0.4 if within 90 days
 *   - 0.1 if further out
 *   - 0.0 if no deadline
 *
 * The Editor also drops items below FIT_FLOOR (they are noise for this profile)
 * and caps the brief at MAX_ITEMS.
 */
function urgency(deadline: string | null): number {
  if (!deadline) return 0
  const days = (new Date(deadline).getTime() - Date.now()) / 86_400_000
  if (days < 0) return 0
  if (days <= 14) return 1.0
  if (days <= 30) return 0.7
  if (days <= 90) return 0.4
  return 0.1
}

function composite(item: RankedItem): number {
  return 0.55 * item.fitScore + 0.3 * item.actionability + 0.15 * urgency(item.deadline)
}

export function editor(state: RadarState): Partial<RadarState> {
  const filtered = state.rankedItems.filter((i) => i.fitScore >= FIT_FLOOR)

  // Dedupe by id (some sources cross-publish).
  const byId = new Map<string, RankedItem>()
  for (const item of filtered) {
    const existing = byId.get(item.id)
    if (!existing || composite(item) > composite(existing)) {
      byId.set(item.id, item)
    }
  }

  const sorted = [...byId.values()]
    .sort((a, b) => composite(b) - composite(a))
    .slice(0, MAX_ITEMS)
    .map((item, idx) => ({ ...item, rank: idx + 1 }))

  console.log(`[editor] kept=${sorted.length} dropped=${state.rankedItems.length - sorted.length}`)
  return {
    rankedItems: sorted,
    stats: { ...state.stats, ranked: sorted.length },
  }
}
