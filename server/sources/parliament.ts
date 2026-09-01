import { hashContent, recordAndDiff } from '../utils/cache'
import { politeFetch } from '../utils/fetch'
import { decodeEntities } from '../utils/text'
import { type RawItem, RawItemSchema } from '../utils/schemas'

const ENDPOINT =
  'https://hansard-api.parliament.uk/search/debates.json?queryParameters.searchTerm=artificial+intelligence&queryParameters.take=25'

interface HansardSearchResponse {
  Results?: Array<{
    DebateSectionExtId?: string
    Title?: string
    DebateSection?: string
    Snippet?: string
    SittingDate?: string
    House?: string
    DebateSectionId?: number
  }>
}

export interface ScoutResult {
  items: RawItem[]
  fetched: number
  cacheHits: number
  cacheMisses: number
}

export async function scoutParliament(): Promise<ScoutResult> {
  const result: ScoutResult = { items: [], fetched: 1, cacheHits: 0, cacheMisses: 0 }
  const fetchedAt = new Date().toISOString()

  let body: string
  try {
    body = await politeFetch(ENDPOINT, { accept: 'application/json' })
  } catch (err) {
    console.error('[parliament] hansard search failed', err)
    return result
  }

  const feedDiff = recordAndDiff(ENDPOINT, body)
  if (feedDiff.changed) result.cacheMisses++
  else result.cacheHits++

  let parsed: HansardSearchResponse
  try {
    parsed = JSON.parse(body) as HansardSearchResponse
  } catch {
    console.error('[parliament] invalid JSON response')
    return result
  }

  for (const r of parsed.Results ?? []) {
    if (!r.Title) continue
    const url = r.DebateSectionExtId
      ? `https://hansard.parliament.uk/debates/GetDebate/${r.DebateSectionExtId}`
      : `https://hansard.parliament.uk/search/Contributions?searchTerm=${encodeURIComponent(r.Title)}`

    const contentHash = hashContent(JSON.stringify({ t: r.Title, d: r.SittingDate }))

    const candidate: RawItem = {
      id: contentHash.slice(0, 16),
      sourceHost: 'hansard.parliament.uk',
      sourceUrl: url,
      title: decodeEntities(r.Title),
      // Hansard dates carry no timezone; the schema wants an instant.
      publishedAt: r.SittingDate ? (/[Zz]|[+-]\d\d:\d\d$/.test(r.SittingDate) ? r.SittingDate : `${r.SittingDate}Z`) : undefined,
      fetchedAt,
      snippet: decodeEntities(r.Snippet ?? r.DebateSection ?? ''),
      contentHash,
    }
    const parsedItem = RawItemSchema.safeParse(candidate)
    if (parsedItem.success) result.items.push(parsedItem.data)
  }

  return result
}
