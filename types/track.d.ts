// Provided by plugins/posthog.client.ts when a key is configured; absent otherwise.
declare module '#app' {
  interface NuxtApp {
    $track?: (event: string, props?: Record<string, unknown>) => void
  }
}
export {}
