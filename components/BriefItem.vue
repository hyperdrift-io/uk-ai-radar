<script setup lang="ts">
import type { ItemKind, QualityFlag, RankedItem } from '~/server/utils/schemas'

const props = defineProps<{ item: RankedItem }>()

const flagText: Record<QualityFlag, string> = {
  'no-deadline': 'No deadline stated on source — verify before relying on this.',
  'no-amount': 'No funding amount stated — check the source.',
  'no-eligibility': 'Eligibility not extracted — read the source carefully.',
  'thin-summary': 'Source summary is short; the radar may be missing context.',
  'angle-not-grounded': 'Angle uses language not present in the source — re-read before acting.',
  'angle-ignores-profile': 'Angle does not strongly reference your profile — ranking may be coincidental.',
  'past-deadline': 'Deadline has passed.',
}

const trustLevel = computed<'high' | 'medium' | 'low' | null>(() => {
  const q = props.item.quality
  if (!q) return null
  if (q.overall >= 0.6) return 'high'
  if (q.overall >= 0.35) return 'medium'
  return 'low'
})

const cta: Record<ItemKind, string> = {
  grant: 'View grant call',
  tender: 'View tender',
  consultation: 'Respond to consultation',
  policy: 'Read policy paper',
  guidance: 'Read guidance',
  committee: 'View inquiry',
  other: 'Read source',
}

const daysRemaining = computed<number | null>(() => {
  if (!props.item.deadline) return null
  const d = (new Date(props.item.deadline).getTime() - Date.now()) / 86_400_000
  return Math.ceil(d)
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
  <section class="brief-item">
    <header class="brief-item__head">
      <strong class="govuk-tag" :class="`govuk-tag--${item.kindColor}`">{{ item.kind }}</strong>
      <span v-if="daysRemaining !== null" class="brief-item__deadline" :data-severity="deadlineSeverity">
        <template v-if="deadlineSeverity === 'past'">Closed {{ -daysRemaining }} day{{ -daysRemaining === 1 ? '' : 's' }} ago</template>
        <template v-else-if="daysRemaining === 0">Closes today</template>
        <template v-else>Closes in <strong>{{ daysRemaining }} day{{ daysRemaining === 1 ? '' : 's' }}</strong></template>
      </span>
      <span v-if="trustLevel" class="brief-item__trust" :data-trust="trustLevel" :title="`Citation grounding ${item.quality!.citationGrounding}, profile fit ${item.quality!.profileCoherence}, actionability ${item.quality!.actionabilityHonesty}`">
        Trust: {{ trustLevel }}
      </span>
      <span class="brief-item__rank">#{{ item.rank }}</span>
    </header>

    <h2 class="govuk-heading-m brief-item__title">{{ item.title }}</h2>

    <p class="govuk-body brief-item__angle">{{ item.angle }}</p>

    <dl class="govuk-summary-list govuk-summary-list--no-border brief-item__meta">
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
      <div class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key">Source summary</dt>
        <dd class="govuk-summary-list__value">{{ item.summary }}</dd>
      </div>
    </dl>

    <ul v-if="item.quality && item.quality.flags.length > 0" class="brief-item__flags govuk-list">
      <li v-for="f in item.quality.flags" :key="f">⚠ {{ flagText[f] }}</li>
    </ul>

    <div class="brief-item__actions">
      <a class="govuk-button" :href="item.sourceUrl" target="_blank" rel="noopener">
        {{ cta[item.kind] }}
      </a>
      <a class="govuk-link brief-item__source" :href="item.sourceUrl" target="_blank" rel="noopener">
        {{ item.sourceHost }}
      </a>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.brief-item {
  padding: 1.5rem 0;
  border-bottom: 1px solid #b1b4b6;
}

.brief-item__head {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.brief-item__rank {
  margin-left: auto;
  font-weight: 700;
  color: #505a5f;
}

.brief-item__deadline {
  font-size: 0.95rem;

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

.brief-item__angle {
  font-size: 1.05rem;
}

.brief-item__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.brief-item__source {
  font-size: 0.875rem;
}

.brief-item__trust {
  font-size: 0.85rem;
  padding: 0.1rem 0.5rem;
  border-radius: 3px;
  border: 1px solid #b1b4b6;
  text-transform: capitalize;

  &[data-trust='high'] {
    background: #cce2d8;
    border-color: #00703c;
    color: #00351c;
  }
  &[data-trust='medium'] {
    background: #fff7bf;
    border-color: #f47738;
    color: #594d00;
  }
  &[data-trust='low'] {
    background: #f3d8d3;
    border-color: #d4351c;
    color: #5c1d10;
  }
}

.brief-item__flags {
  margin: 0.5rem 0 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #fff7bf;
  border-left: 4px solid #f47738;
  font-size: 0.9rem;

  li + li {
    margin-top: 0.25rem;
  }
}
</style>
