<script setup lang="ts">
import { ALL_KINDS, DEADLINE_FILTERS, type DeadlineFilter } from '~/utils/workspace'
import type { ItemKind } from '~/server/utils/schemas'

useSeoMeta({
  title: 'Explore — UK AI Radar',
  description: 'Search UK gov AI grants, tenders, consultations and inquiries — with your agent, on the same page.',
})

const { ws, sourceHosts, visible, loadItems, hydrate, setFilters, reset } = useWorkspace()
const pending = ref(true)
const agentReady = ref(false)

onMounted(async () => {
  hydrate()
  await loadItems()
  pending.value = false
  agentReady.value = Boolean(document.modelContext)
})

function toggleKind(kind: ItemKind) {
  const kinds = ws.value.filters.kinds.includes(kind) ? ws.value.filters.kinds.filter((k) => k !== kind) : [...ws.value.filters.kinds, kind]
  setFilters({ kinds })
}

function toggleSource(host: string) {
  const sources = ws.value.filters.sources.includes(host) ? ws.value.filters.sources.filter((s) => s !== host) : [...ws.value.filters.sources, host]
  setFilters({ sources })
}

const deadlineLabel: Record<DeadlineFilter, string> = {
  any: 'Any deadline',
  open: 'Open',
  'closing-soon': 'Closing in 30 days',
  closed: 'Closed',
}
</script>

<template>
  <article data-page="explore">
    <header>
      <h1>Explore</h1>
      <p>
        Every UK government item the radar has read — grants, tenders, consultations, policy, guidance.
        <template v-if="agentReady">Your agent can see this page too: it reads all of it, you keep the final call.</template>
        <template v-else>Open this page in a browser with an agent (ChatGPT's browser, or Chrome with WebMCP on) and the agent works it with you.</template>
      </p>
    </header>

    <FounderProfileCard />

    <form aria-label="Filters" @submit.prevent>
      <label>Keyword <input :value="ws.filters.query" name="query" type="search" placeholder="computer vision, NHS, foundation models" @input="setFilters({ query: ($event.target as HTMLInputElement).value })" /></label>
      <fieldset>
        <legend>Kind</legend>
        <label v-for="k in ALL_KINDS" :key="k"><input type="checkbox" name="kinds" :value="k" :checked="ws.filters.kinds.includes(k)" @change="toggleKind(k)" /> {{ k }}</label>
      </fieldset>
      <fieldset v-if="sourceHosts.length > 1">
        <legend>Source</legend>
        <label v-for="h in sourceHosts" :key="h"><input type="checkbox" name="sources" :value="h" :checked="ws.filters.sources.includes(h)" @change="toggleSource(h)" /> {{ h }}</label>
      </fieldset>
      <label>Deadline
        <select name="deadline" :value="ws.filters.deadline" @change="setFilters({ deadline: ($event.target as HTMLSelectElement).value as DeadlineFilter })">
          <option v-for="d in DEADLINE_FILTERS" :key="d" :value="d">{{ deadlineLabel[d] }}</option>
        </select>
      </label>
      <footer>
        <button type="button" value="clear" @click="setFilters({ query: '', kinds: [], deadline: 'any', sources: [] })">Clear filters</button>
        <button type="button" value="reset" @click="reset">Start over</button>
      </footer>
    </form>

    <Shortlist />

    <section aria-label="Items">
      <p v-if="pending" role="status">Loading the radar…</p>
      <template v-else>
        <p role="status"><output>{{ visible.length }}</output> item{{ visible.length === 1 ? '' : 's' }}</p>
        <p v-if="visible.length === 0">No items match. Widen the filters, or ask your agent to search differently.</p>
        <ItemCard v-for="item in visible" :id="item.id" :key="item.sourceUrl" :item="item" />
      </template>
    </section>
  </article>
</template>
