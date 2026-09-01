export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  runtimeConfig: {
    public: {
      // Set NUXT_PUBLIC_POSTHOG_KEY in the environment to switch analytics on; empty = off.
      posthogKey: '',
      posthogHost: 'https://eu.i.posthog.com',
    },
  },
  ssr: true,
  devtools: { enabled: true },
  typescript: { strict: true },
  css: ['~/assets/styles/main.scss'],
  app: {
    head: {
      title: 'UK AI Radar — independent government signal for AI founders',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Independent project. We read gov.uk, UKRI and Parliament so AI founders see grants, tenders, consultations and policy shifts that matter — ranked for their profile.',
        },
        { property: 'og:title', content: 'UK AI Radar — read the government with your agent' },
        {
          property: 'og:description',
          content: 'Every UK government item that matters to an AI founder, on one page you and your agent work together. It reads all of it; you keep the final call.',
        },
        { property: 'og:image', content: 'https://radar.hyperdrift.io/images/og.png' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://radar.hyperdrift.io/images/og.png' },
      ],
    },
  },
  nitro: {
    // bin/digest.ts uses better-sqlite3 directly; keep it server-only.
    experimental: { asyncContext: true },
  },
})
