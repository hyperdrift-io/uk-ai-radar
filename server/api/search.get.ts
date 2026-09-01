import { listItems, listSourceHosts } from '../utils/cache'

/** Everything the radar has analysed, newest deadline first. Filtering happens on the page. */
export default defineEventHandler((event) => {
  const q = getQuery(event)
  const limit = typeof q.limit === 'string' ? Math.min(500, Math.max(1, Number(q.limit) || 100)) : 100
  return { items: listItems(limit), sourceHosts: listSourceHosts() }
})
