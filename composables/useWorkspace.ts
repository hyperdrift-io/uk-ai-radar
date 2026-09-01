import type { AnalysedItem } from '~/server/utils/schemas'
import {
  type AgentRead,
  type Filters,
  type MarkStatus,
  type ProfileInput,
  type Workspace,
  emptyWorkspace,
  listItems,
  normaliseProfile,
  renderBrief,
  setAside,
  shortlist,
} from '~/utils/workspace'

const STORAGE_KEY = 'uk-ai-radar.workspace.v1'

/**
 * One reactive workspace shared by the page (founder) and the WebMCP tools (agent).
 * Persisted per browser so a founder's shortlist survives the tab.
 */
export function useWorkspace() {
  const ws = useState<Workspace>('workspace', emptyWorkspace)
  const items = useState<AnalysedItem[]>('items', () => [])
  const sourceHosts = useState<string[]>('sourceHosts', () => [])
  const loaded = useState<boolean>('items-loaded', () => false)

  async function loadItems(): Promise<AnalysedItem[]> {
    if (loaded.value) return items.value
    const data = await $fetch<{ items: AnalysedItem[]; sourceHosts: string[] }>('/api/search?limit=500')
    items.value = data.items
    sourceHosts.value = data.sourceHosts
    loaded.value = true
    return items.value
  }

  function hydrate() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) ws.value = { ...emptyWorkspace(), ...JSON.parse(raw) }
    } catch {
      // A broken saved workspace is not worth breaking the page over.
    }
    watch(ws, (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })
  }

  const byUrl = (url: string) => items.value.find((i) => i.sourceUrl === url) ?? null

  function setFilters(patch: Partial<Filters>) {
    ws.value.filters = { ...ws.value.filters, ...patch }
  }

  function proposeProfile(input: ProfileInput) {
    ws.value.profile = normaliseProfile(input)
    ws.value.profileStatus = 'proposed'
  }

  function confirmProfile(input: ProfileInput) {
    ws.value.profile = normaliseProfile(input)
    ws.value.profileStatus = 'set'
  }

  function clearProfile() {
    ws.value.profile = null
    ws.value.profileStatus = 'empty'
  }

  function read(url: string, read: Omit<AgentRead, 'at'>) {
    ws.value.reads[url] = { ...read, at: new Date().toISOString() }
    const current = ws.value.marks[url]
    if (!current || current.status === 'aside') ws.value.marks[url] = { status: 'suggested', by: 'agent' }
  }

  function mark(url: string, status: MarkStatus, by: 'founder' | 'agent', reason?: string) {
    const current = ws.value.marks[url]
    ws.value.marks[url] = { ...current, status, by, reason }
  }

  function unmark(url: string) {
    delete ws.value.marks[url]
  }

  function note(url: string, text: string) {
    const current = ws.value.marks[url] ?? { status: 'kept' as const, by: 'founder' as const }
    ws.value.marks[url] = { ...current, note: text.trim() || undefined }
  }

  function draftBrief(): string {
    ws.value.brief = renderBrief(items.value, ws.value)
    return ws.value.brief
  }

  function reset() {
    ws.value = emptyWorkspace()
  }

  const visible = computed(() => listItems(items.value, ws.value))
  const picks = computed(() => shortlist(items.value, ws.value))
  const aside = computed(() => setAside(items.value, ws.value))

  return {
    ws,
    items,
    sourceHosts,
    visible,
    picks,
    aside,
    loadItems,
    hydrate,
    byUrl,
    setFilters,
    proposeProfile,
    confirmProfile,
    clearProfile,
    read,
    mark,
    unmark,
    note,
    draftBrief,
    reset,
  }
}
