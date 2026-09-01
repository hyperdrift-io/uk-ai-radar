import type { AnalysedItem, ItemKind } from '~/server/utils/schemas'

/**
 * The shared workspace — the state a founder and their agent both act on.
 * Pure data + pure functions. The reactive wrapper lives in composables/useWorkspace.ts,
 * the agent-facing tools in plugins/webmcp.client.ts.
 */

export type Fit = 'strong' | 'possible' | 'weak'
export type DeadlineFilter = 'any' | 'open' | 'closing-soon' | 'closed'
export type MarkStatus = 'suggested' | 'kept' | 'aside'
export type ProfileStatus = 'empty' | 'proposed' | 'set'

export interface Filters {
  query: string
  kinds: ItemKind[]
  deadline: DeadlineFilter
  sources: string[]
}

export interface FounderProfile {
  company: string
  stage: string
  sectors: string[]
  capabilities: string[]
  goals: string[]
  exclude: string[]
}

/** What the agent concluded about one item — shown on the card, kept with the item. */
export interface AgentRead {
  fit: Fit
  angle: string
  nextStep: string
  at: string
}

/** What the founder (or the agent, pending the founder's call) did with one item. */
export interface Mark {
  status: MarkStatus
  by: 'founder' | 'agent'
  reason?: string
  note?: string
}

export interface Workspace {
  profile: FounderProfile | null
  profileStatus: ProfileStatus
  filters: Filters
  reads: Record<string, AgentRead>
  marks: Record<string, Mark>
  brief: string | null
}

export const ALL_KINDS: ItemKind[] = ['grant', 'tender', 'consultation', 'policy', 'guidance', 'committee', 'other']
export const DEADLINE_FILTERS: DeadlineFilter[] = ['any', 'open', 'closing-soon', 'closed']
export const FITS: Fit[] = ['strong', 'possible', 'weak']

export function emptyFilters(): Filters {
  return { query: '', kinds: [], deadline: 'any', sources: [] }
}

export function emptyWorkspace(): Workspace {
  return { profile: null, profileStatus: 'empty', filters: emptyFilters(), reads: {}, marks: {}, brief: null }
}

export function daysUntil(deadline: string | null, now: Date): number | null {
  if (!deadline) return null
  return Math.ceil((new Date(deadline).getTime() - now.getTime()) / 86_400_000)
}

function matchesDeadline(item: AnalysedItem, filter: DeadlineFilter, now: Date): boolean {
  const days = daysUntil(item.deadline, now)
  switch (filter) {
    case 'open':
      return days === null || days >= 0
    case 'closing-soon':
      return days !== null && days >= 0 && days <= 30
    case 'closed':
      return days !== null && days < 0
    default:
      return true
  }
}

function matchesQuery(item: AnalysedItem, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [item.title, item.summary, item.body ?? '', item.amount ?? '', ...item.eligibility].join(' ').toLowerCase()
  return q.split(/\s+/).every((word) => hay.includes(word))
}

/** Same semantics as the server search, run on the items the page already holds. */
export function filterItems(items: AnalysedItem[], filters: Filters, now = new Date()): AnalysedItem[] {
  return items.filter(
    (item) =>
      (filters.kinds.length === 0 || filters.kinds.includes(item.kind)) &&
      (filters.sources.length === 0 || filters.sources.includes(item.sourceHost)) &&
      matchesDeadline(item, filters.deadline, now) &&
      matchesQuery(item, filters.query),
  )
}

/** The rows the founder sees in the main list: filtered, minus what was set aside. */
export function listItems(items: AnalysedItem[], ws: Workspace, now = new Date()): AnalysedItem[] {
  return filterItems(items, ws.filters, now).filter((item) => ws.marks[item.sourceUrl]?.status !== 'aside')
}

export function shortlist(items: AnalysedItem[], ws: Workspace): AnalysedItem[] {
  const rank = (item: AnalysedItem) => (ws.marks[item.sourceUrl]?.status === 'kept' ? 0 : 1)
  return items
    .filter((item) => ['kept', 'suggested'].includes(ws.marks[item.sourceUrl]?.status ?? ''))
    .sort((a, b) => rank(a) - rank(b))
}

export function setAside(items: AnalysedItem[], ws: Workspace): AnalysedItem[] {
  return items.filter((item) => ws.marks[item.sourceUrl]?.status === 'aside')
}

/** The short form an agent reads in bulk. */
export function compactItem(item: AnalysedItem, ws: Workspace, now = new Date()) {
  const days = daysUntil(item.deadline, now)
  return {
    url: item.sourceUrl,
    title: item.title,
    kind: item.kind,
    body: item.body,
    deadline: item.deadline,
    daysUntilDeadline: days,
    amount: item.amount,
    source: item.sourceHost,
    mark: ws.marks[item.sourceUrl]?.status ?? null,
    agentFit: ws.reads[item.sourceUrl]?.fit ?? null,
  }
}

/** The full record plus everything the founder and agent have said about it. */
export function fullItem(item: AnalysedItem, ws: Workspace, now = new Date()) {
  return {
    ...compactItem(item, ws, now),
    published: item.publishedAt ?? null,
    summary: item.summary,
    eligibility: item.eligibility,
    extract: item.snippet,
    agentRead: ws.reads[item.sourceUrl] ?? null,
    founderNote: ws.marks[item.sourceUrl]?.note ?? null,
    reason: ws.marks[item.sourceUrl]?.reason ?? null,
  }
}

export function parseList(text: string): string[] {
  return text
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Lists arrive as arrays from the agent and as comma text from the form; both are welcome. */
export type ProfileInput = Partial<{ [K in keyof FounderProfile]: FounderProfile[K] | string }>

export function normaliseProfile(input: ProfileInput): FounderProfile {
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : typeof v === 'string' ? parseList(v) : []
  return {
    company: String(input.company ?? '').trim(),
    stage: String(input.stage ?? '').trim(),
    sectors: list(input.sectors),
    capabilities: list(input.capabilities),
    goals: list(input.goals),
    exclude: list(input.exclude),
  }
}

/** Markdown brief from the shortlist — what leaves the page with the founder. */
export function renderBrief(items: AnalysedItem[], ws: Workspace, now = new Date()): string {
  const rows = shortlist(items, ws)
  const lines: string[] = []
  const who = ws.profile?.company ? ` for ${ws.profile.company}` : ''
  lines.push(`# UK AI Radar brief${who}`, '', `_${now.toISOString().slice(0, 10)} · ${rows.length} item${rows.length === 1 ? '' : 's'} · source: gov.uk, UKRI, Parliament_`, '')
  for (const item of rows) {
    const read = ws.reads[item.sourceUrl]
    const mark = ws.marks[item.sourceUrl]
    const days = daysUntil(item.deadline, now)
    const due = item.deadline ? ` · closes ${item.deadline}${days !== null && days >= 0 ? ` (${days}d)` : ''}` : ''
    lines.push(`## ${item.title}`, `${item.kind}${item.body ? ` · ${item.body}` : ''}${item.amount ? ` · ${item.amount}` : ''}${due}`, '', item.summary)
    if (read) lines.push('', `**Fit: ${read.fit}.** ${read.angle}`, `**Next step:** ${read.nextStep}`)
    if (mark?.note) lines.push('', `> ${mark.note}`)
    lines.push('', `Source: ${item.sourceUrl}`, '')
  }
  return lines.join('\n').trim() + '\n'
}
