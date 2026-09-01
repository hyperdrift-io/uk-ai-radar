import posthog from 'posthog-js'

/**
 * Measure from day one: page views, whether a visitor arrived with an agent,
 * every tool the agent calls, and every call the founder makes on a suggestion.
 * Off unless a project key is configured. No identity, no PII: the workspace
 * never leaves the browser and nothing typed into it is sent.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { posthogKey, posthogHost } = useRuntimeConfig().public
  if (!posthogKey) return

  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: 'never',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: true,
  })

  const router = useRouter()
  router.afterEach((to) => posthog.capture('$pageview', { $current_url: window.location.origin + to.fullPath }))

  nuxtApp.hook('app:mounted', () => {
    posthog.capture('$pageview')
    posthog.capture('agent_presence', { agent_present: Boolean(document.modelContext) })
  })

  return { provide: { track: (event: string, props?: Record<string, unknown>) => posthog.capture(event, props) } }
})
