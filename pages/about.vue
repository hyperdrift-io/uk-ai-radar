<script setup lang="ts">
useSeoMeta({ title: 'About — UK AI Radar' })
</script>

<template>
  <article>
    <h1 class="govuk-heading-xl">About</h1>

    <h2 class="govuk-heading-l">Mission</h2>
    <p class="govuk-body">
      Help UK-based AI founders see, in one place each week, the parts of government activity that
      change what they should do next — grants, tenders, consultations, policy direction.
    </p>

    <h2 class="govuk-heading-l">Independence</h2>
    <p class="govuk-body">
      This project is independent. It is not affiliated with, endorsed by, or operated by HM
      Government. We use the
      <a class="govuk-link" href="https://design-system.service.gov.uk/">GOV.UK Design System</a>
      because its accessibility and clarity are exemplary; we do not use the crown, the GOV.UK
      wordmark, or imply official status.
    </p>

    <h2 class="govuk-heading-l">Methodology</h2>
    <ul class="govuk-list govuk-list--bullet">
      <li>Diff-first retrieval — we re-fetch every tracked URL on each run but only forward items whose content hash changed.</li>
      <li>Structured extraction — every fact in a brief comes from a typed schema, not free-form prose.</li>
      <li>Personalised ranking — the same retrieved items are scored differently per founder profile.</li>
      <li>Source citation on every claim — no link, no claim.</li>
    </ul>

    <h2 class="govuk-heading-l">Limitations</h2>
    <ul class="govuk-list govuk-list--bullet">
      <li>The radar is best-effort. Always verify deadlines and eligibility on the source page before acting.</li>
      <li>Coverage is the three whitelisted sources only. Think tanks, press and social are excluded by design.</li>
    </ul>
  </article>
</template>
