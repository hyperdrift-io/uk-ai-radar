import { defineAgentTools } from '~/utils/agentTools'

/**
 * WebMCP: the page offers its own actions to the agent sitting next to the founder.
 * Tool definitions live in utils/agentTools.ts; this plugin only registers them.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    const mc = document.modelContext
    if (!mc) return
    const w = useWorkspace()
    const router = useRouter()
    w.hydrate()

    const onExplore = async () => {
      if (router.currentRoute.value.path !== '/explore') await router.push('/explore')
      await w.loadItems()
    }

    const { tools, briefTool } = defineAgentTools(w, onExplore)
    Promise.all(tools.map((tool) => mc.registerTool(tool))).catch((err) => {
      console.error('[webmcp] tool registration failed', err)
    })

    let briefRegistration: AbortController | null = null
    watch(
      () => w.picks.value.length,
      (count) => {
        if (count > 0 && !briefRegistration) {
          briefRegistration = new AbortController()
          mc.registerTool(briefTool, { signal: briefRegistration.signal }).catch((err) => console.error('[webmcp] draft_brief registration failed', err))
        } else if (count === 0 && briefRegistration) {
          briefRegistration.abort()
          briefRegistration = null
        }
      },
      { immediate: true },
    )
  })
})
