export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
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
      ],
    },
  },
  nitro: {
    // bin/digest.ts uses better-sqlite3 directly; keep it server-only.
    experimental: { asyncContext: true },
  },
})
