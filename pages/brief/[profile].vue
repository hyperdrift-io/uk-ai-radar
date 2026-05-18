<script setup lang="ts">
const route = useRoute()
const profile = computed(() => String(route.params.profile))

const { data, error } = await useFetch(() => `/api/brief/${profile.value}`)

useSeoMeta({
  title: () => `Brief for ${profile.value} — UK AI Radar`,
  description: () =>
    `Ranked weekly UK government signals for the ${profile.value} profile — grants, tenders, consultations.`,
})
</script>

<template>
  <article>
    <h1 class="govuk-heading-xl">Brief: {{ profile }}</h1>

    <div v-if="error" class="govuk-error-summary" role="alert">
      <h2 class="govuk-error-summary__title">No brief has been generated yet</h2>
      <div class="govuk-error-summary__body">
        <p class="govuk-body">
          The radar has not produced a brief for the <code>{{ profile }}</code> profile.
          To create one:
        </p>
        <ol class="govuk-list govuk-list--number">
          <li>Make sure <code>profiles/{{ profile }}.json</code> exists.</li>
          <li>Run <code>pnpm digest --profile profiles/{{ profile }}.json</code>.</li>
          <li>Reload this page.</li>
        </ol>
      </div>
    </div>

    <template v-else-if="data">
      <p class="govuk-body-l">
        Generated {{ new Date(data.generatedAt).toLocaleDateString('en-GB') }} ·
        {{ data.itemCount }} ranked item{{ data.itemCount === 1 ? '' : 's' }}.
      </p>

      <div v-if="data.itemCount === 0" class="govuk-notification-banner" role="region" aria-label="No items">
        <div class="govuk-notification-banner__header">
          <h2 class="govuk-notification-banner__title">Nothing actionable for this profile this week</h2>
        </div>
        <div class="govuk-notification-banner__content">
          <p class="govuk-body">
            The radar fetched all <NuxtLink class="govuk-link" to="/sources">tracked sources</NuxtLink> but
            no item scored highly enough to be useful for this profile. This usually means one of:
          </p>
          <ul class="govuk-list govuk-list--bullet">
            <li>Government output this cycle was generic — wait for the next run.</li>
            <li>The profile is narrow — broaden <code>sectors</code> or <code>goals</code> in <code>profiles/{{ profile }}.json</code>.</li>
            <li>You have an old digest from a previous narrow run — re-run <code>pnpm digest --profile profiles/{{ profile }}.json</code>.</li>
          </ul>
        </div>
      </div>

      <BriefItem v-for="item in data.items" :key="item.id" :item="item" />
    </template>
  </article>
</template>
