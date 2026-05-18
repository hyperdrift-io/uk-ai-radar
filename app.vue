<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'en' },
})
</script>

<template>
  <div class="govuk-template__body">
    <GovukBanner />
    <header class="site-header">
      <div class="site-header__inner">
        <NuxtLink to="/" class="site-header__brand">UK AI Radar</NuxtLink>
        <nav class="site-header__nav" aria-label="Primary">
          <NuxtLink to="/">Home</NuxtLink>
          <NuxtLink to="/sources">Sources</NuxtLink>
          <NuxtLink to="/about">About</NuxtLink>
        </nav>
      </div>
    </header>
    <main id="main-content" class="govuk-main-wrapper" role="main">
      <div class="govuk-width-container">
        <NuxtPage />
      </div>
    </main>
    <footer class="site-footer">
      <div class="govuk-width-container">
        <p>
          Independent project by
          <a href="https://ai.hyperdrift.io">Orchestra</a>. Not affiliated with HM Government.
          Source code and methodology published openly.
        </p>
      </div>
    </footer>
  </div>
</template>
