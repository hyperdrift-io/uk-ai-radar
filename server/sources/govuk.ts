import { XMLParser } from 'fast-xml-parser'
import { hashContent, recordAndDiff } from '../utils/cache'
import { politeFetch } from '../utils/fetch'
import { decodeEntities } from '../utils/text'
import { type RawItem, RawItemSchema } from '../utils/schemas'

const FEEDS: ReadonlyArray<{ url: string; label: string }> = [
  {
    url: 'https://www.gov.uk/government/organisations/department-for-science-innovation-and-technology.atom',
    label: 'DSIT',
  },
  {
    url: 'https://www.gov.uk/government/organisations/ai-safety-institute.atom',
    label: 'AI Safety Institute',
  },
  {
    url: 'https://www.gov.uk/search/all.atom?keywords=artificial+intelligence&order=updated-newest',
    label: 'gov.uk search: AI',
  },
]

// Regulator organisation feeds (CMA, ICO) were dropped: merger inquiries and FOI
// releases outnumbered AI signal ten to one, and their AI items already arrive
// through the gov.uk AI search feed. Anything older than a year is history, not radar.
const MAX_AGE_DAYS = 365

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

interface AtomEntry {
  id?: string
  title?: string | { '#text'?: string }
  link?: { '@_href'?: string } | Array<{ '@_href'?: string }>
  updated?: string
  published?: string
  summary?: string | { '#text'?: string }
  content?: string | { '#text'?: string }
}

function textOf(v: AtomEntry['title']): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') return v['#text'] ?? ''
  return ''
}

function linkOf(v: AtomEntry['link']): string {
  if (Array.isArray(v)) return v[0]?.['@_href'] ?? ''
  return v?.['@_href'] ?? ''
}

function bound(s: string, max = 800): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

export interface ScoutResult {
  items: RawItem[]
  fetched: number
  cacheHits: number
  cacheMisses: number
}

/**
 * Fetch all gov.uk feeds and emit every current entry. Per-item reuse is decided
 * downstream in the Analyst (via the analysed_items store) — we don't drop items
 * here, otherwise unchanged-but-still-relevant items (open grants, live policy
 * pages) would never reach the brief.
 */
export async function scoutGovUk(): Promise<ScoutResult> {
  const result: ScoutResult = { items: [], fetched: 0, cacheHits: 0, cacheMisses: 0 }
  const fetchedAt = new Date().toISOString()

  for (const feed of FEEDS) {
    result.fetched++
    let body: string
    try {
      body = await politeFetch(feed.url, { accept: 'application/atom+xml' })
    } catch (err) {
      console.error(`[gov.uk] feed failed: ${feed.label}`, err)
      continue
    }

    const feedDiff = recordAndDiff(feed.url, body)
    if (feedDiff.changed) result.cacheMisses++
    else result.cacheHits++

    const parsed = xml.parse(body) as { feed?: { entry?: AtomEntry | AtomEntry[] } }
    const entries = parsed.feed?.entry
    const list = Array.isArray(entries) ? entries : entries ? [entries] : []

    for (const e of list) {
      const url = linkOf(e.link)
      if (!url || !url.startsWith('https://www.gov.uk/')) continue
      const published = e.published ?? e.updated
      if (published && Date.now() - new Date(published).getTime() > MAX_AGE_DAYS * 86_400_000) continue

      const contentHash = hashContent(JSON.stringify({ t: textOf(e.title), u: e.updated }))

      const candidate: RawItem = {
        id: contentHash.slice(0, 16),
        sourceHost: 'www.gov.uk',
        sourceUrl: url,
        title: decodeEntities(textOf(e.title)) || '(untitled)',
        publishedAt: e.published ?? e.updated,
        fetchedAt,
        snippet: decodeEntities(bound(textOf(e.summary) || textOf(e.content))),
        contentHash,
      }
      const parsedItem = RawItemSchema.safeParse(candidate)
      if (parsedItem.success) result.items.push(parsedItem.data)
    }
  }

  return result
}
