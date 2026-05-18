import { listSourceHosts, searchItems, type SearchFilters } from '../utils/cache'
import { ItemKindSchema } from '../utils/schemas'

export default defineEventHandler((event) => {
  const q = getQuery(event)

  const filters: SearchFilters = {
    q: typeof q.q === 'string' && q.q.trim() ? q.q.trim() : undefined,
    deadline:
      q.deadline === 'open' || q.deadline === 'closing-soon' || q.deadline === 'closed'
        ? q.deadline
        : undefined,
    limit: typeof q.limit === 'string' ? Math.min(500, Math.max(1, Number(q.limit) || 100)) : 100,
  }

  if (typeof q.kinds === 'string' && q.kinds) {
    filters.kinds = q.kinds.split(',').flatMap((k) => {
      const parsed = ItemKindSchema.safeParse(k)
      return parsed.success ? [parsed.data] : []
    })
  }
  if (typeof q.sources === 'string' && q.sources) {
    filters.sources = q.sources.split(',').map((s) => s.trim()).filter(Boolean)
  }

  return {
    items: searchItems(filters),
    sourceHosts: listSourceHosts(),
  }
})
