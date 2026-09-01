<script setup lang="ts">
import type { AnalysedItem, ItemKind } from '~/server/utils/schemas'
import { daysUntil } from '~/utils/workspace'

const props = defineProps<{ item: AnalysedItem }>()
const { ws, focus, mark, unmark, drop, reason: setReason, note } = useWorkspace()

const cta: Record<ItemKind, string> = {
  grant: 'View grant call',
  tender: 'View tender',
  consultation: 'Respond to consultation',
  policy: 'Read policy paper',
  guidance: 'Read guidance',
  committee: 'View inquiry',
  other: 'Read source',
}

const url = computed(() => props.item.sourceUrl)
const status = computed(() => ws.value.marks[url.value]?.status ?? 'none')
const read = computed(() => ws.value.reads[url.value] ?? null)
const reason = computed(() => ws.value.marks[url.value]?.reason ?? null)
const days = computed(() => daysUntil(props.item.deadline, new Date()))
const severity = computed(() => (days.value === null ? null : days.value < 0 ? 'past' : days.value <= 14 ? 'critical' : days.value <= 30 ? 'soon' : 'ok'))
// A short flash whenever the agent (or the founder) changes this card, so the change is seen.
const flash = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | undefined
watch([read, status], () => {
  flash.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.value = false), 1600)
})

const reasonText = computed({
  get: () => ws.value.marks[url.value]?.reason ?? '',
  set: (v: string) => setReason(url.value, v),
})

const noteText = computed({
  get: () => ws.value.marks[url.value]?.note ?? '',
  set: (v: string) => note(url.value, v),
})
</script>

<template>
  <section :data-kind="item.kind" :data-mark="status" :data-flash="flash || undefined" :data-focus="focus === url || undefined">
    <header>
      <strong>{{ item.kind }}</strong>
      <time v-if="days !== null" :datetime="item.deadline ?? undefined" :data-severity="severity">
        <template v-if="severity === 'past'">Closed {{ -days }}d ago</template>
        <template v-else-if="days === 0">Closes today</template>
        <template v-else>Closes in {{ days }}d</template>
      </time>
      <small>{{ item.sourceHost }}</small>
    </header>

    <h2>{{ item.title }}</h2>
    <p>{{ item.summary }}</p>

    <dl v-if="item.amount || item.body || item.eligibility.length">
      <template v-if="item.amount"><dt>Amount</dt><dd>{{ item.amount }}</dd></template>
      <template v-if="item.body"><dt>Body</dt><dd>{{ item.body }}</dd></template>
      <template v-if="item.eligibility.length"><dt>Eligibility</dt><dd>{{ item.eligibility.join('; ') }}</dd></template>
    </dl>

    <blockquote v-if="read" :data-fit="read.fit">
      <p><b>Your agent's read · {{ read.fit }} fit.</b> {{ read.angle }}</p>
      <p><b>Next step.</b> {{ read.nextStep }}</p>
    </blockquote>
    <p v-if="status === 'aside' && reason" role="note">Set aside: {{ reason }}</p>

    <label v-if="status === 'kept'">Your note <input v-model.lazy="noteText" name="note" placeholder="What to do with it, who to ask…" /></label>
    <label v-if="status === 'dropped'">Dropped. Tell your agent why <input v-model.lazy="reasonText" name="reason" placeholder="e.g. universities only, we're a company" /></label>

    <footer>
      <a :href="item.sourceUrl" target="_blank" rel="noopener">{{ cta[item.kind] }}</a>
      <template v-if="status === 'suggested'">
        <button type="button" name="mark" value="kept" @click="mark(url, 'kept', 'founder')">Keep</button>
        <button type="button" name="mark" value="drop" @click="drop(url)">Drop</button>
      </template>
      <template v-else-if="status === 'dropped'">
        <button type="button" name="mark" value="kept" @click="mark(url, 'kept', 'founder')">Shortlist after all</button>
        <button type="button" name="mark" value="restore" @click="unmark(url)">Forget it</button>
      </template>
      <template v-else-if="status === 'kept'">
        <button type="button" name="mark" value="drop" @click="unmark(url)">Remove from shortlist</button>
      </template>
      <template v-else-if="status === 'aside'">
        <button type="button" name="mark" value="restore" @click="unmark(url)">Restore</button>
      </template>
      <template v-else>
        <button type="button" name="mark" value="kept" @click="mark(url, 'kept', 'founder')">Shortlist</button>
        <button type="button" name="mark" value="aside" @click="mark(url, 'aside', 'founder')">Set aside</button>
      </template>
    </footer>
  </section>
</template>
