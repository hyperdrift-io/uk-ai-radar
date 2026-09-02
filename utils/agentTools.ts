import type { ItemKind } from '~/server/utils/schemas'
import { ALL_KINDS, DEADLINE_FILTERS, FITS, type DeadlineFilter, type Fit, compactItem, filterItems, fullItem } from '~/utils/workspace'

type Workspace = ReturnType<typeof useWorkspace>

/**
 * The tools the page offers an agent. Each one reuses the same functions the
 * buttons call and changes what the founder sees; the founder keeps the call.
 * Inputs come from a model, so every field is checked before use.
 */

const MAX = 2000
const str = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, MAX) : '')
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : str(v) ? [str(v)] : [])
const listSchema = (description: string) => ({ type: 'array', items: { type: 'string' }, description })
const fail = (error: string) => ({ error })

export function defineAgentTools(w: Workspace, onExplore: () => Promise<void>) {
  const requireItem = async (url: unknown) => {
    await onExplore()
    return str(url) ? w.byUrl(str(url)) : null
  }

  const tools: ModelContextTool[] = [
    {
      name: 'search_items',
      description:
        'Filter the radar — every UK government item on grants, tenders, consultations, policy and guidance for AI companies (sources: gov.uk, UKRI, Parliament) — and read the matches. The filters apply on the page at the same time, so the founder sees the same list.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words to look for in the title, summary, issuing body and eligibility. Any word matches; best matches come first. Leave empty for everything.' },
          kinds: { type: 'array', items: { type: 'string', enum: ALL_KINDS }, description: 'Only these kinds of item.' },
          deadline: { type: 'string', enum: DEADLINE_FILTERS, description: '"closing-soon" = within 30 days; "open" = no deadline or not yet passed.' },
          sources: listSchema('Only these source hosts, e.g. "www.ukri.org".'),
          limit: { type: 'integer', description: 'How many matches to return (default 40, max 200). The page always shows all matches.' },
        },
      },
      async execute(input) {
        await onExplore()
        const filters = {
          query: str(input.query),
          kinds: list(input.kinds).filter((k): k is ItemKind => ALL_KINDS.includes(k as ItemKind)),
          deadline: DEADLINE_FILTERS.includes(input.deadline as DeadlineFilter) ? (input.deadline as DeadlineFilter) : 'any',
          sources: list(input.sources),
        }
        w.setFilters(filters)
        const matches = filterItems(w.items.value, filters)
        const limit = Math.min(200, Math.max(1, Number(input.limit) || 40))
        w.log('search_items', `${matches.length} match${matches.length === 1 ? '' : 'es'}${filters.query ? ` for "${filters.query}"` : ''}${filters.kinds.length ? ` · ${filters.kinds.join(', ')}` : ''}${filters.deadline !== 'any' ? ` · ${filters.deadline}` : ''}`)
        return { total: matches.length, shown: Math.min(limit, matches.length), items: matches.slice(0, limit).map((i) => compactItem(i, w.ws.value)) }
      },
    },
    {
      name: 'read_item',
      description:
        'Read one item in full: summary, amount, eligibility, deadline, the source extract, plus anything the founder or you have already noted on it. The page scrolls to the card so the founder sees what you are reading.',
      inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'The item url, as returned by search_items.' } }, required: ['url'] },
      async execute(input) {
        const item = await requireItem(input.url)
        if (!item) return fail('No item with that url on the radar.')
        w.log('read_item', item.title)
        await w.setFocus(item.sourceUrl)
        return fullItem(item, w.ws.value)
      },
    },
    {
      name: 'propose_founder_profile',
      description:
        "Fill in the founder's profile on the page from what you know about their company — sector, technical capabilities, stage and goals. The founder checks it and confirms it on screen; use the profile to judge fit when you suggest items.",
      inputSchema: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          stage: { type: 'string', description: 'e.g. "pre-seed", "seed", "series-a", "revenue-funded".' },
          sectors: listSchema('Markets the company sells into, e.g. "NHS", "defence", "fintech".'),
          capabilities: listSchema('What the company builds, e.g. "computer vision", "LLM agents".'),
          goals: listSchema('What they want from government this quarter, e.g. "find an NHS pilot".'),
          exclude: listSchema('What to leave out, e.g. "academic-only grants".'),
        },
        required: ['company'],
      },
      async execute(input) {
        if (!str(input.company)) return fail('company is required.')
        await onExplore()
        w.proposeProfile({ company: str(input.company), stage: str(input.stage), sectors: list(input.sectors), capabilities: list(input.capabilities), goals: list(input.goals), exclude: list(input.exclude) })
        w.log('propose_founder_profile', `${w.ws.value.profile?.company} — waiting for you to keep it`)
        return { status: 'proposed', profile: w.ws.value.profile, next: 'The founder confirms the profile on the page.' }
      },
    },
    {
      name: 'suggest_item',
      description:
        "Put an item on the founder's shortlist as your suggestion, with your read of why it fits and the concrete next step. It shows on the card and in the shortlist as suggested until the founder keeps or drops it. If the founder dropped it before, read_workspace has their reason — only suggest again with a genuinely new angle.",
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          fit: { type: 'string', enum: FITS, description: 'How well it fits the founder profile.' },
          angle: { type: 'string', description: 'One to three sentences: why this matters for this founder, grounded in the item.' },
          nextStep: { type: 'string', description: 'The one concrete action, e.g. "Register intent by 12 Sep, outline due 3 Oct".' },
        },
        required: ['url', 'fit', 'angle', 'nextStep'],
      },
      async execute(input) {
        const item = await requireItem(input.url)
        if (!item) return fail('No item with that url on the radar.')
        if (!FITS.includes(input.fit as Fit)) return fail(`fit must be one of ${FITS.join(', ')}.`)
        if (!str(input.angle) || !str(input.nextStep)) return fail('angle and nextStep are both required.')
        w.read(item.sourceUrl, { fit: input.fit as Fit, angle: str(input.angle), nextStep: str(input.nextStep) })
        w.log('suggest_item', `${input.fit} fit · ${item.title}`)
        await w.setFocus(item.sourceUrl)
        return { status: w.ws.value.marks[item.sourceUrl].status, shortlist: w.picks.value.length }
      },
    },
    {
      name: 'set_aside_items',
      description: 'Move one or many items out of the list into "set aside", with one reason that applies to all of them. The founder can restore any of them with one click.',
      inputSchema: {
        type: 'object',
        properties: {
          urls: listSchema('The item urls to set aside.'),
          reason: { type: 'string', description: 'Short and specific, e.g. "closed 1 Aug", "universities only", "outside the founder\'s sectors".' },
        },
        required: ['urls', 'reason'],
      },
      async execute(input) {
        await onExplore()
        const reason = str(input.reason)
        if (!reason) return fail('reason is required.')
        const urls = list(input.urls)
        const found = urls.map((u) => w.byUrl(u)).filter((i) => i !== null)
        for (const item of found) w.mark(item.sourceUrl, 'aside', 'agent', reason)
        w.log('set_aside_items', `${found.length} item${found.length === 1 ? '' : 's'} — ${reason}`)
        return { setAside: found.length, unknown: urls.length - found.length, listed: w.visible.value.length }
      },
    },
    {
      name: 'read_workspace',
      description:
        "Read the shared state of the page: the founder profile and whether they confirmed it, the current filters, the shortlist with the founder's keep decisions and notes, the suggestions they dropped and why, what was set aside, and the drafted brief if any. Read this before suggesting, and again to see what the founder did.",
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        await onExplore()
        const ws = w.ws.value
        w.log('read_workspace', `${w.picks.value.length} on the shortlist, ${w.drops.value.length} dropped, ${w.aside.value.length} set aside`)
        return {
          profile: ws.profile,
          profileStatus: ws.profileStatus,
          filters: ws.filters,
          listed: w.visible.value.length,
          shortlist: w.picks.value.map((i) => ({ ...compactItem(i, ws), by: ws.marks[i.sourceUrl].by, note: ws.marks[i.sourceUrl].note ?? null, agentRead: ws.reads[i.sourceUrl] ?? null })),
          dropped: w.drops.value.map((i) => ({ url: i.sourceUrl, title: i.title, founderReason: ws.marks[i.sourceUrl].reason ?? null, yourRead: ws.reads[i.sourceUrl] ?? null })),
          setAside: w.aside.value.map((i) => ({ url: i.sourceUrl, title: i.title, reason: ws.marks[i.sourceUrl].reason ?? null, by: ws.marks[i.sourceUrl].by })),
          brief: ws.brief,
        }
      },
    },
  ]

  // Only meaningful once there is a shortlist; the plugin registers it then and drops it when the shortlist empties.
  const briefTool: ModelContextTool = {
    name: 'draft_brief',
    description: "Write the shortlist up as a markdown brief on the page — kept items first, with your read and the founder's notes — and return it.",
    inputSchema: { type: 'object', properties: {} },
    async execute() {
      await onExplore()
      const brief = w.draftBrief()
      w.log('draft_brief', `${w.picks.value.length} item${w.picks.value.length === 1 ? '' : 's'} written up`)
      return { brief }
    },
  }

  return { tools, briefTool }
}
