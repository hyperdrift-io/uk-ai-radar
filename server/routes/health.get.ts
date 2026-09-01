import { listSourceHosts } from '../utils/cache'

// Liveness for the fleet: 200 when the process answers and the item store opens.
export default defineEventHandler(() => ({ ok: true, sources: listSourceHosts().length }))
