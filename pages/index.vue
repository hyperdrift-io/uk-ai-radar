<script setup lang="ts">
useSeoMeta({
  title: 'UK AI Radar — government signal for AI founders',
  description:
    'An independent agentic radar over gov.uk, UKRI and Parliament. Grants, tenders, consultations and policy shifts — ranked for your profile.',
})

const { data: briefs } = await useFetch('/api/briefs')
</script>

<template>
  <article>
    <h1 class="govuk-heading-xl">We read the British government so you can build.</h1>

    <p class="govuk-body-l">
      UK AI Radar is an independent agentic system. Every week it reads gov.uk, UKRI and
      Parliament, finds what changed, and ranks the items that matter for an AI founder's profile —
      grants to apply to, tenders to bid on, consultations to respond to, policy shifts to position
      around.
    </p>

    <h2 class="govuk-heading-l">Bring your agent</h2>
    <p class="govuk-body">
      Open <NuxtLink to="/explore" class="govuk-link">Explore</NuxtLink> in a browser with an agent — ChatGPT's
      built-in browser, or Chrome with WebMCP switched on — and the page offers the agent its own controls.
      It reads every item; you keep the final call on every one it suggests.
    </p>

    <h2 class="govuk-heading-l">How it works</h2>
    <ol class="govuk-list govuk-list--number">
      <li><strong>Scout</strong> fetches every tracked feed and emits all current items.</li>
      <li><strong>Analyst</strong> extracts deadlines, money, eligibility and named bodies — reusing prior analysis when the source has not changed.</li>
      <li><strong>Strategist</strong> scores each item against your founder profile.</li>
      <li><strong>Editor</strong> ranks the most relevant items and writes the brief.</li>
    </ol>

    <h2 class="govuk-heading-l">Available briefs</h2>
    <div v-if="briefs && briefs.length > 0">
      <ul class="govuk-list">
        <li v-for="b in briefs" :key="b.profile">
          <NuxtLink :to="`/brief/${b.profile}`" class="govuk-link">{{ b.profile }}</NuxtLink>
          <span class="govuk-body-s">
            · last updated
            <time :datetime="b.generatedAt">
              {{ new Date(b.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) }}
            </time>
          </span>
        </li>
      </ul>
    </div>
    <div v-else class="govuk-inset-text">
      No briefs yet. Create a profile in <code>profiles/</code> and run
      <code>pnpm digest --profile profiles/your-profile.json</code> to generate one.
    </div>

    <h2 class="govuk-heading-l">Methodology</h2>
    <p class="govuk-body">
      See <NuxtLink to="/sources" class="govuk-link">tracked sources</NuxtLink> and the
      <NuxtLink to="/about" class="govuk-link">methodology</NuxtLink> page.
    </p>
  </article>
</template>
