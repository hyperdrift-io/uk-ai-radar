import type { ItemKind } from '~/server/utils/schemas'
import { ALL_KINDS, DEADLINE_FILTERS, FITS, compactItem, filterItems, fullItem } from '~/utils/workspace'

/**
 * WebMCP: the page offers its own actions to the agent sitting next to the founder.
 * Every tool reuses the page's client-side logic and changes what the founder sees —
 * the agent reads the whole radar, the founder keeps the final call.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    const mc = document.modelContext
    if (!mc) return
    const w = useWorkspace()
    const router = useRouter()

    const onExplore = async () => {
      if (router.currentRoute.value.path !== '/explore') await router.push('/explore')
      return w.loadItems()
    }

    const fail = (message: string) => ({ error: message })

    const requireItem = async (url: unknown) => {
      await onExplore()
      const item = typeof url === 'string' ? w.byUrl(url) : null
      return item ?? null
    }

    const listSchema = (description: string) => ({ type: 'array', items: { type: 'string' }, description })

    mc.registerTool({
      name: 'search_items',
      description:
        'Filter the radar — every UK government item on grants, tenders, consultations, policy and guidance for AI companies (sources: gov.uk, UKRI, Parliament) — and read the matches. The filters apply on the page at the same time, so the founder sees the same list.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words to look for in the title, summary, issuing body and eligibility. Leave empty for everything.' },
          kinds: { type: 'array', items: { type: 'string', enum: ALL_KINDS }, description: 'Only these kinds of item.' },
          deadline: { type: 'string', enum: DEADLINE_FILTERS, description: '"closing-soon" = within 30 days; "open" = no deadline or not yet passed.' },
          sources: { type: 'array', items: { type: 'string' }, description: 'Only these source hosts, e.g. "www.ukri.org".' },
          limit: { type: 'integer', description: 'How many matches to return (default 40, max 200). The page always shows all matches.' },
        },
      },
      async execute(input) {
        const items = await onExplore()
        const filters = {
          query: typeof input.query === 'string' ? input.query : '',
          kinds: Array.isArray(input.kinds) ? input.kinds.filter((k: unknown): k is ItemKind => ALL_KINDS.includes(k as ItemKind)) : [],
          deadline: DEADLINE_FILTERS.includes(input.deadline) ? input.deadline : 'any',
          sources: Array.isArray(input.sources) ? input.sources.map(String) : [],
        }
        w.setFilters(filters)
        const matches = filterItems(items, filters)
        const limit = Math.min(200, Math.max(1, Number(input.limit) || 40))
        w.log('search_items', `${matches.length} match${matches.length === 1 ? '' : 'es'}${filters.query ? ` for "${filters.query}"` : ''}${filters.kinds.length ? ` · ${filters.kinds.join(', ')}` : ''}${filters.deadline !== 'any' ? ` · ${filters.deadline}` : ''}`)
        return {
          total: matches.length,
          shown: Math.min(limit, matches.length),
          items: matches.slice(0, limit).map((i) => compactItem(i, w.ws.value)),
        }
      },
    })

    mc.registerTool({
      name: 'read_item',
      description: 'Read one item in full: summary, amount, eligibility, deadline, the source extract, plus anything the founder or you have already noted on it.',
      inputSchema: {
        type: 'object',
        properties: { url: { type: 'string', description: 'The item url, as returned by search_items.' } },
        required: ['url'],
      },
      async execute(input) {
        const item = await requireItem(input.url)
        if (item) w.log('read_item', item.title)
        return item ? fullItem(item, w.ws.value) : fail('No item with that url on the radar.')
      },
    })

    mc.registerTool({
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
        await onExplore()
        w.proposeProfile(input)
        w.log('propose_founder_profile', `${w.ws.value.profile?.company ?? 'profile'} — waiting for you to keep it`)
        return { status: 'proposed', profile: w.ws.value.profile, next: 'The founder confirms the profile on the page.' }
      },
    })

    mc.registerTool({
      name: 'suggest_item',
      description:
        "Put an item on the founder's shortlist as your suggestion, with your read of why it fits and the concrete next step. It shows on the card and in the shortlist as suggested until the founder keeps or drops it.",
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
        if (!FITS.includes(input.fit)) return fail(`fit must be one of ${FITS.join(', ')}.`)
        w.read(item.sourceUrl, { fit: input.fit, angle: String(input.angle), nextStep: String(input.nextStep) })
        w.log('suggest_item', `${input.fit} fit · ${item.title}`)
        return { status: w.ws.value.marks[item.sourceUrl].status, shortlist: w.picks.value.length }
      },
    })

    mc.registerTool({
      name: 'set_aside_item',
      description: 'Move an item out of the list into "set aside", with the reason. The founder can restore it with one click.',
      inputSchema: {
        type: 'object',
        properties: { url: { type: 'string' }, reason: { type: 'string', description: 'Short and specific, e.g. "closed 1 Aug", "academic institutions only".' } },
        required: ['url', 'reason'],
      },
      async execute(input) {
        const item = await requireItem(input.url)
        if (!item) return fail('No item with that url on the radar.')
        w.mark(item.sourceUrl, 'aside', 'agent', String(input.reason))
        w.log('set_aside_item', `${item.title} — ${input.reason}`)
        return { status: 'aside', listed: w.visible.value.length }
      },
    })

    mc.registerTool({
      name: 'read_workspace',
      description:
        "Read the shared state of the page: the founder profile and whether they confirmed it, the current filters, the shortlist with the founder's keep/drop decisions and notes, what was set aside, and the drafted brief if any. Read this before suggesting, and again to see what the founder did.",
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        await onExplore()
        const ws = w.ws.value
        w.log('read_workspace', `${w.picks.value.length} on the shortlist, ${w.aside.value.length} set aside`)
        return {
          profile: ws.profile,
          profileStatus: ws.profileStatus,
          filters: ws.filters,
          listed: w.visible.value.length,
          shortlist: w.picks.value.map((i) => ({ ...compactItem(i, ws), by: ws.marks[i.sourceUrl].by, note: ws.marks[i.sourceUrl].note ?? null, agentRead: ws.reads[i.sourceUrl] ?? null })),
          setAside: w.aside.value.map((i) => ({ url: i.sourceUrl, title: i.title, reason: ws.marks[i.sourceUrl].reason ?? null, by: ws.marks[i.sourceUrl].by })),
          brief: ws.brief,
        }
      },
    })

    // The brief only makes sense once there is a shortlist — register it then, drop it when empty.
    let briefTool: AbortController | null = null
    watch(
      () => w.picks.value.length,
      (count) => {
        if (count > 0 && !briefTool) {
          briefTool = new AbortController()
          mc.registerTool(
            {
              name: 'draft_brief',
              description: "Write the shortlist up as a markdown brief on the page — kept items first, with your read and the founder's notes — and return it.",
              inputSchema: { type: 'object', properties: {} },
              async execute() {
                await onExplore()
                const brief = w.draftBrief()
                w.log('draft_brief', `${w.picks.value.length} item${w.picks.value.length === 1 ? '' : 's'} written up`)
                return { brief }
              },
            },
            { signal: briefTool.signal },
          )
        } else if (count === 0 && briefTool) {
          briefTool.abort()
          briefTool = null
        }
      },
      { immediate: true },
    )
  })
})
