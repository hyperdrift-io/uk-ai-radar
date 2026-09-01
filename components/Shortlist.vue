<script setup lang="ts">
const { ws, picks, aside, draftBrief, unmark } = useWorkspace()
const copied = ref(false)

async function copy() {
  if (!ws.value.brief) return
  try {
    await navigator.clipboard.writeText(ws.value.brief)
  } catch {
    return // no clipboard here (insecure context); the brief is still on screen to select
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <aside aria-label="Shortlist">
    <section aria-label="Agent activity" aria-live="polite">
      <h2>Your agent <output>{{ ws.activity.length ? 'on this page' : 'not here yet' }}</output></h2>
      <p v-if="ws.activity.length === 0">Each thing it does on this page shows up here.</p>
      <ol v-else>
        <li v-for="a in ws.activity" :key="a.at"><code>{{ a.tool }}</code> {{ a.summary }}</li>
      </ol>
    </section>
    <h2>Shortlist <output>{{ picks.length }}</output></h2>
    <p v-if="picks.length === 0">Nothing yet. Shortlist an item below, or ask your agent to suggest what fits you.</p>
    <ol v-else>
      <li v-for="item in picks" :key="item.sourceUrl" :data-mark="ws.marks[item.sourceUrl].status">
        <a :href="`#${item.id}`">{{ item.title }}</a>
        <small v-if="ws.marks[item.sourceUrl].status === 'suggested'">suggested by your agent</small>
      </li>
    </ol>
    <p v-if="picks.length > 0"><small>Saved in this browser. Your agent can read it back any time; copy the brief to take it anywhere else.</small></p>
    <footer v-if="picks.length > 0">
      <button type="button" value="draft" @click="draftBrief">Draft brief</button>
      <button v-if="ws.brief" type="button" value="copy" @click="copy">{{ copied ? 'Copied' : 'Copy brief' }}</button>
    </footer>
    <pre v-if="ws.brief">{{ ws.brief }}</pre>
    <details v-if="aside.length > 0">
      <summary>Set aside <output>{{ aside.length }}</output></summary>
      <ul>
        <li v-for="item in aside" :key="item.sourceUrl">
          {{ item.title }} <small v-if="ws.marks[item.sourceUrl].reason">— {{ ws.marks[item.sourceUrl].reason }}</small>
          <button type="button" value="restore" @click="unmark(item.sourceUrl)">Restore</button>
        </li>
      </ul>
    </details>
  </aside>
</template>
