<script setup lang="ts">
import type { AnalysedItem, ItemKind } from '~/server/utils/schemas'
import { kindColor } from '~/server/utils/schemas'

const props = defineProps<{ item: AnalysedItem }>()

const cta: Record<ItemKind, string> = {
  grant: 'View grant call',
  tender: 'View tender',
  consultation: 'Respond to consultation',
  policy: 'Read policy paper',
  guidance: 'Read guidance',
  committee: 'View inquiry',
  other: 'Read source',
}

const color = computed(() => kindColor(props.item.kind))

const daysRemaining = computed<number | null>(() => {
  if (!props.item.deadline) return null
  return Math.ceil((new Date(props.item.deadline).getTime() - Date.now()) / 86_400_000)
})

const deadlineSeverity = computed<'critical' | 'soon' | 'ok' | 'past' | null>(() => {
  const d = daysRemaining.value
  if (d === null) return null
  if (d < 0) return 'past'
  if (d <= 14) return 'critical'
  if (d <= 30) return 'soon'
  return 'ok'
})
</script>

<template>
  <section class="item-card">
    <header class="item-card__head">
      <strong class="govuk-tag" :class="`govuk-tag--${color}`">{{ item.kind }}</strong>
      <span v-if="daysRemaining !== null" class="item-card__deadline" :data-severity="deadlineSeverity">
        <template v-if="deadlineSeverity === 'past'">Closed {{ -daysRemaining }}d ago</template>
        <template v-else-if="daysRemaining === 0">Closes today</template>
        <template v-else>Closes in <strong>{{ daysRemaining }}d</strong></template>
      </span>
      <span class="item-card__source">{{ item.sourceHost }}</span>
    </header>

    <h2 class="govuk-heading-m item-card__title">{{ item.title }}</h2>

    <p class="govuk-body">{{ item.summary }}</p>

    <dl class="govuk-summary-list govuk-summary-list--no-border item-card__meta">
      <div v-if="item.amount" class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key">Amount</dt>
        <dd class="govuk-summary-list__value">{{ item.amount }}</dd>
      </div>
      <div v-if="item.body" class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key">Body</dt>
        <dd class="govuk-summary-list__value">{{ item.body }}</dd>
      </div>
      <div v-if="item.eligibility.length > 0" class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key">Eligibility</dt>
        <dd class="govuk-summary-list__value">{{ item.eligibility.join('; ') }}</dd>
      </div>
    </dl>

    <a class="govuk-button" :href="item.sourceUrl" target="_blank" rel="noopener">
      {{ cta[item.kind] }}
    </a>
  </section>
</template>

<style lang="scss" scoped>
.item-card {
  padding: 1.25rem 0;
  border-bottom: 1px solid #b1b4b6;
}

.item-card__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.item-card__source {
  margin-left: auto;
  font-size: 0.85rem;
  color: #505a5f;
}

.item-card__deadline {
  font-size: 0.9rem;

  &[data-severity='critical'] {
    color: #d4351c;
    font-weight: 700;
  }
  &[data-severity='soon'] {
    color: #f47738;
  }
  &[data-severity='past'] {
    color: #505a5f;
    text-decoration: line-through;
  }
}
</style>
