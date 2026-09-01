import { XMLParser } from 'fast-xml-parser'
import { hashContent, recordAndDiff } from '../utils/cache'
import { politeFetch } from '../utils/fetch'
import { decodeEntities } from '../utils/text'
import { type RawItem, RawItemSchema } from '../utils/schemas'

const FEED = 'https://www.ukri.org/opportunity/feed/'

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

interface RssItem {
  title?: string
  link?: string
  pubDate?: string
  description?: string
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

export async function scoutUkri(): Promise<ScoutResult> {
  const result: ScoutResult = { items: [], fetched: 1, cacheHits: 0, cacheMisses: 0 }
  const fetchedAt = new Date().toISOString()

  let body: string
  try {
    body = await politeFetch(FEED, { accept: 'application/rss+xml' })
  } catch (err) {
    console.error('[ukri] feed failed', err)
    return result
  }

  const feedDiff = recordAndDiff(FEED, body)
  if (feedDiff.changed) result.cacheMisses++
  else result.cacheHits++

  const parsed = xml.parse(body) as { rss?: { channel?: { item?: RssItem | RssItem[] } } }
  const entries = parsed.rss?.channel?.item
  const list = Array.isArray(entries) ? entries : entries ? [entries] : []

  for (const e of list) {
    const url = e.link
    if (!url || !url.includes('ukri.org/opportunity/')) continue

    const contentHash = hashContent(JSON.stringify({ t: e.title, p: e.pubDate }))

    const candidate: RawItem = {
      id: contentHash.slice(0, 16),
      sourceHost: 'www.ukri.org',
      sourceUrl: url,
      title: decodeEntities(e.title ?? '') || '(untitled)',
      publishedAt: e.pubDate ? new Date(e.pubDate).toISOString() : undefined,
      fetchedAt,
      snippet: decodeEntities(bound(e.description ?? '')),
      contentHash,
    }
    const parsedItem = RawItemSchema.safeParse(candidate)
    if (parsedItem.success) result.items.push(parsedItem.data)
  }

  return result
}
