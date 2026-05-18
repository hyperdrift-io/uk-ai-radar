<script setup lang="ts">
import type { RankedItem } from '~/server/utils/schemas'

defineProps<{ item: RankedItem }>()
</script>

<template>
  <section class="brief-item">
    <header class="brief-item__head">
      <strong class="govuk-tag" :class="`govuk-tag--${item.kindColor}`">{{ item.kind }}</strong>
      <span v-if="item.deadline" class="brief-item__deadline">
        Deadline: <strong>{{ new Date(item.deadline).toLocaleDateString('en-GB') }}</strong>
      </span>
    </header>

    <h2 class="govuk-heading-m">
      <a class="govuk-link" :href="item.sourceUrl" rel="noopener">{{ item.title }}</a>
    </h2>

    <p class="govuk-body">{{ item.angle }}</p>

    <dl class="govuk-summary-list govuk-summary-list--no-border brief-item__meta">
      <div v-if="item.amount" class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key">Amount</dt>
        <dd class="govuk-summary-list__value">{{ item.amount }}</dd>
      </div>
      <div v-if="item.body" class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key">Body</dt>
        <dd class="govuk-summary-list__value">{{ item.body }}</dd>
      </div>
      <div class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key">Source</dt>
        <dd class="govuk-summary-list__value">
          <a class="govuk-link" :href="item.sourceUrl">{{ item.sourceHost }}</a>
        </dd>
      </div>
    </dl>
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
}

.brief-item__deadline {
  font-size: 0.9rem;
  color: #505a5f;
}
</style>
