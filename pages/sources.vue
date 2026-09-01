<script setup lang="ts">
useSeoMeta({ title: 'Sources — UK AI Radar' })

const sources = [
  {
    host: 'www.gov.uk',
    description: 'DSIT, AISI and departmental announcements; consultations; policy papers.',
    access: 'Public search API + RSS feeds.',
  },
  {
    host: 'www.ukri.org / apply-for-innovation-funding.service.gov.uk',
    description: 'Open Innovate UK / UKRI grant calls, deadlines, eligibility.',
    access: 'Public listing pages + RSS.',
  },
  {
    host: 'developer.parliament.uk',
    description: 'Hansard, committee inquiries, written questions, evidence sessions.',
    access: 'Official Parliament APIs.',
  },
]
</script>

<template>
  <article>
    <h1 class="govuk-heading-xl">Sources</h1>

    <p class="govuk-body">
      The radar only reads the sources listed below. Anything off-list is rejected by the fetcher.
      We cite and link — we never republish gov content beyond fair-use snippets.
    </p>

    <dl class="govuk-summary-list">
      <div v-for="s in sources" :key="s.host" class="govuk-summary-list__row">
        <dt class="govuk-summary-list__key">{{ s.host }}</dt>
        <dd class="govuk-summary-list__value">
          <p class="govuk-body">{{ s.description }}</p>
          <p class="govuk-body-s">{{ s.access }}</p>
        </dd>
      </div>
    </dl>
  </article>
</template>
