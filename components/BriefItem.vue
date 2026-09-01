<script setup lang="ts">
import type { ItemKind, QualityFlag, RankedItem } from '~/server/utils/schemas'

const props = defineProps<{ item: RankedItem }>()

// Every line here is about what the radar could read, never about the source's standing:
// these are official pages. A gap is a limit of our scan, and the link is the fix.
const flagText: Record<QualityFlag, string> = {
  'no-deadline': 'No closing date found in what we read. The source page will say.',
  'no-amount': 'No amount found in what we read. Check the source for the funding level.',
  'no-eligibility': 'Eligibility not found in what we read. The source page states who can apply.',
  'thin-summary': 'Short source text. Read the page before deciding.',
  'angle-not-grounded': 'The angle goes beyond the source wording. Read the page before acting on it.',
  'angle-ignores-profile': 'The angle does not lean on your profile much. Treat the ranking as a hint.',
  'past-deadline': 'The closing date has passed.',
}

const cta: Record<ItemKind, string> = {
  grant: 'View grant call',
  tender: 'View tender',
  consultation: 'Respond to consultation',
  policy: 'Read policy paper',
  guidance: 'Read guidance',
  committee: 'View inquiry',
  other: 'Read source',
}

const sourceName = computed(() => {
  const host = props.item.sourceHost
  if (host === 'www.gov.uk') return 'GOV.UK'
  if (host === 'www.ukri.org') return 'UKRI'
  if (host.endsWith('parliament.uk')) return 'UK Parliament'
  return host
})

const sourcePath = computed(() => {
  try {
    const u = new URL(props.item.sourceUrl)
    return u.hostname + u.pathname.replace(/\/$/, '')
  } catch {
    return props.item.sourceUrl
  }
})

const days = computed<number | null>(() => {
  if (!props.item.deadline) return null
  return Math.ceil((new Date(props.item.deadline).getTime() - Date.now()) / 86_400_000)
})

const severity = computed(() => (days.value === null ? null : days.value < 0 ? 'past' : days.value <= 14 ? 'critical' : days.value <= 30 ? 'soon' : 'ok'))
</script>

<template>
  <section :data-kind="item.kind" :data-rank="item.rank" :data-read="item.readDepth ?? 'feed'">
    <header>
      <strong>{{ item.kind }}</strong>
      <time v-if="days !== null" :datetime="item.deadline ?? undefined" :data-severity="severity">
        <template v-if="severity === 'past'">Closed {{ -days }} day{{ -days === 1 ? '' : 's' }} ago</template>
        <template v-else-if="days === 0">Closes today</template>
        <template v-else>Closes {{ item.deadline }} · {{ days }} day{{ days === 1 ? '' : 's' }}</template>
      </time>
      <output>#{{ item.rank }}</output>
    </header>

    <h2>{{ item.title }}</h2>
    <cite><a :href="item.sourceUrl" target="_blank" rel="noopener">{{ sourceName }} · {{ sourcePath }}</a></cite>

    <p>{{ item.angle }}</p>

    <dl>
      <template v-if="item.amount"><dt>Amount</dt><dd>{{ item.amount }}</dd></template>
      <template v-if="item.body"><dt>Body</dt><dd>{{ item.body }}</dd></template>
      <template v-if="item.eligibility.length"><dt>Who can apply</dt><dd>{{ item.eligibility.join('; ') }}</dd></template>
      <dt>From the source</dt><dd>{{ item.summary }}</dd>
    </dl>

    <small v-if="item.readDepth === 'page'">Read from the full source page.</small>
    <small v-else>Read from the feed entry only. The source page has the full detail.</small>

    <ul v-if="item.quality && item.quality.flags.length">
      <li v-for="f in item.quality.flags" :key="f">{{ flagText[f] }}</li>
    </ul>

    <footer>
      <a :href="item.sourceUrl" target="_blank" rel="noopener">{{ cta[item.kind] }}</a>
    </footer>
  </section>
</template>
