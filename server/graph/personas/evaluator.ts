import type { Profile, Quality, QualityFlag, RankedItem } from '../../utils/schemas'
import type { RadarState } from '../state'

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'for', 'with', 'by', 'is', 'are',
  'was', 'were', 'be', 'been', 'this', 'that', 'these', 'those', 'as', 'at', 'from', 'it',
  'its', 'their', 'your', 'you', 'we', 'our', 'i', 'will', 'would', 'should', 'could',
  'can', 'may', 'might', 'do', 'does', 'have', 'has', 'had', 'than', 'then', 'so', 'if',
  'about', 'into', 'through', 'over', 'between', 'against', 'such', 'any', 'all', 'most',
  'some', 'no', 'not', 'but', 'because', 'while', 'when', 'where', 'why', 'how', 'what',
])

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9£\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  )
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0) return 0
  let hit = 0
  for (const t of a) if (b.has(t)) hit++
  return hit / a.size
}

function profileBag(p: Profile): Set<string> {
  return tokens(
    [
      ...p.sectors,
      ...p.capabilities,
      ...p.goals,
      ...p.exclude,
      p.geo,
      p.stage,
    ].join(' '),
  )
}

/**
 * Deterministic quality evaluation — no LLM call. Cheap, transparent, reproducible.
 * An LLM-backed deep evaluator can be added later as a second pass for top-N items.
 */
function evaluateItem(item: RankedItem, profile: Profile): Quality {
  const flags: QualityFlag[] = []

  const summary = `${item.title} ${item.summary} ${item.snippet}`
  const angleTokens = tokens(item.angle)
  const summaryTokens = tokens(summary)
  const citationGrounding = overlap(angleTokens, summaryTokens)

  const profileTokens = profileBag(profile)
  const profileCoherence = overlap(angleTokens, profileTokens)

  if (!item.deadline) flags.push('no-deadline')
  else if (new Date(item.deadline).getTime() < Date.now()) flags.push('past-deadline')
  if (!item.amount && (item.kind === 'grant' || item.kind === 'tender')) flags.push('no-amount')
  if (item.eligibility.length === 0 && (item.kind === 'grant' || item.kind === 'tender'))
    flags.push('no-eligibility')
  if (item.summary.trim().length < 60) flags.push('thin-summary')
  if (citationGrounding < 0.25) flags.push('angle-not-grounded')
  if (profileCoherence < 0.1) flags.push('angle-ignores-profile')

  const actionableKind = item.kind === 'grant' || item.kind === 'tender' || item.kind === 'consultation'
  const hasFutureDeadline = !!item.deadline && new Date(item.deadline).getTime() > Date.now()
  const actionabilityHonesty =
    (actionableKind ? 0.5 : 0.2) + (hasFutureDeadline ? 0.5 : 0) - (item.eligibility.length === 0 ? 0.1 : 0)

  const overall = Math.max(
    0,
    Math.min(1, 0.4 * citationGrounding + 0.3 * profileCoherence + 0.3 * clamp(actionabilityHonesty)),
  )

  return {
    citationGrounding: round2(citationGrounding),
    profileCoherence: round2(profileCoherence),
    actionabilityHonesty: round2(clamp(actionabilityHonesty)),
    overall: round2(overall),
    flags,
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n))
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function evaluator(state: RadarState): Partial<RadarState> {
  const evaluated = state.rankedItems.map((item) => ({
    ...item,
    quality: evaluateItem(item, state.profile),
  }))

  const lowQuality = evaluated.filter((i) => (i.quality?.overall ?? 0) < 0.3).length
  console.log(`[evaluator] flagged-low-quality=${lowQuality}/${evaluated.length}`)
  return { rankedItems: evaluated }
}
