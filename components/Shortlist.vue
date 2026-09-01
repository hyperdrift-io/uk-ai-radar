<script setup lang="ts">
const { ws, picks, aside, draftBrief, unmark } = useWorkspace()
const copied = ref(false)

async function copy() {
  if (!ws.value.brief) return
  await navigator.clipboard.writeText(ws.value.brief)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <aside aria-label="Shortlist">
    <h2>Shortlist <output>{{ picks.length }}</output></h2>
    <p v-if="picks.length === 0">Nothing yet. Shortlist an item below, or ask your agent to suggest what fits you.</p>
    <ol v-else>
      <li v-for="item in picks" :key="item.sourceUrl" :data-mark="ws.marks[item.sourceUrl].status">
        <a :href="`#${item.id}`">{{ item.title }}</a>
        <small v-if="ws.marks[item.sourceUrl].status === 'suggested'">suggested by your agent</small>
      </li>
    </ol>
    <footer v-if="picks.length > 0">
      <button type="button" @click="draftBrief">Draft brief</button>
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
