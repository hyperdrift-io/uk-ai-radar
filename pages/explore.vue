<script setup lang="ts">
import type { AnalysedItem, ItemKind } from '~/server/utils/schemas'

useSeoMeta({
  title: 'Explore — UK AI Radar',
  description: 'Search UK gov AI grants, tenders, consultations and inquiries.',
})

const route = useRoute()

const allKinds: ItemKind[] = ['grant', 'tender', 'consultation', 'policy', 'guidance', 'committee', 'other']
const deadlineOptions = [
  { value: '', label: 'Any deadline' },
  { value: 'open', label: 'Open (deadline not passed)' },
  { value: 'closing-soon', label: 'Closing in the next 30 days' },
  { value: 'closed', label: 'Closed (deadline passed)' },
] as const

const q = ref<string>(typeof route.query.q === 'string' ? route.query.q : '')
const selectedKinds = ref<ItemKind[]>(
  typeof route.query.kinds === 'string' ? (route.query.kinds.split(',') as ItemKind[]) : [],
)
const deadline = ref<string>(typeof route.query.deadline === 'string' ? route.query.deadline : '')

const queryParams = computed(() => {
  const p = new URLSearchParams()
  if (q.value) p.set('q', q.value)
  if (selectedKinds.value.length > 0) p.set('kinds', selectedKinds.value.join(','))
  if (deadline.value) p.set('deadline', deadline.value)
  return p.toString()
})

const { data, refresh, pending } = await useFetch<{ items: AnalysedItem[]; sourceHosts: string[] }>(
  () => `/api/search?${queryParams.value}`,
  { watch: [queryParams] },
)

function toggleKind(k: ItemKind) {
  const i = selectedKinds.value.indexOf(k)
  if (i >= 0) selectedKinds.value.splice(i, 1)
  else selectedKinds.value.push(k)
}

function clear() {
  q.value = ''
  selectedKinds.value = []
  deadline.value = ''
}
</script>

<template>
  <article>
    <h1 class="govuk-heading-xl">Explore</h1>
    <p class="govuk-body-l">
      Search every UK gov AI item the radar has analysed. No profile required — this is a raw view
      of the data, not a personalised brief.
    </p>

    <form class="explore-form" @submit.prevent="refresh()">
      <div class="govuk-form-group">
        <label class="govuk-label" for="q">Keyword</label>
        <input
          class="govuk-input"
          id="q"
          type="search"
          placeholder="e.g. computer vision, NHS, foundation models"
          v-model="q"
        />
      </div>

      <fieldset class="govuk-fieldset">
        <legend class="govuk-fieldset__legend">Kind</legend>
        <div class="govuk-checkboxes govuk-checkboxes--small">
          <div v-for="k in allKinds" :key="k" class="govuk-checkboxes__item">
            <input
              class="govuk-checkboxes__input"
              :id="`kind-${k}`"
              type="checkbox"
              :checked="selectedKinds.includes(k)"
              @change="toggleKind(k)"
            />
            <label class="govuk-label govuk-checkboxes__label" :for="`kind-${k}`">{{ k }}</label>
          </div>
        </div>
      </fieldset>

      <div class="govuk-form-group">
        <label class="govuk-label" for="deadline">Deadline</label>
        <select class="govuk-select" id="deadline" v-model="deadline">
          <option v-for="d in deadlineOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>

      <div class="explore-form__actions">
        <button class="govuk-button govuk-button--secondary" type="button" @click="clear">Clear</button>
      </div>
    </form>

    <hr class="govuk-section-break govuk-section-break--m" />

    <p v-if="pending" class="govuk-body">Searching…</p>
    <template v-else-if="data">
      <p class="govuk-body">
        <strong>{{ data.items.length }}</strong> item{{ data.items.length === 1 ? '' : 's' }}.
      </p>

      <div v-if="data.items.length === 0" class="govuk-inset-text">
        No items match. Either the filters are too narrow, or the radar has not yet ingested anything in
        this slice — try running <code>pnpm digest --profile profiles/example.json</code> to populate the store.
      </div>

      <ItemCard v-for="item in data.items" :key="item.sourceUrl" :item="item" />
    </template>
  </article>
</template>

<style lang="scss" scoped>
.explore-form {
  display: grid;
  gap: 1rem;
}

.explore-form__actions {
  display: flex;
  gap: 0.75rem;
}
</style>
