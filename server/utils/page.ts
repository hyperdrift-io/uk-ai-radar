import { politeFetch } from './fetch'
import { decodeEntities } from './text'

/** Hosts whose pages carry the facts a feed entry only hints at (closing date, amount, who can apply). */
const PAGE_HOSTS = new Set(['www.gov.uk', 'www.ukri.org', 'apply-for-innovation-funding.service.gov.uk'])

export const PAGE_TEXT_LIMIT = 6000

export function canReadPage(url: string): boolean {
  try {
    return PAGE_HOSTS.has(new URL(url).hostname)
  } catch {
    return false
  }
}

/** The readable text of a page's main content, tags and chrome stripped, bounded for the model. */
export function mainText(html: string, limit = PAGE_TEXT_LIMIT): string {
  const main = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ?? html
  const stripped = main
    .replace(/<(script|style|nav|header|footer|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|li|h[1-6]|dt|dd|tr|div|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(stripped)
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
    .slice(0, limit)
}

/** Fetch and read the source page; null when the host is not one we read or the fetch fails. */
export async function readSourcePage(url: string): Promise<string | null> {
  if (!canReadPage(url)) return null
  try {
    const html = await politeFetch(url, { accept: 'text/html', timeoutMs: 20_000 })
    const text = mainText(html)
    return text.length > 200 ? text : null
  } catch (err) {
    console.error(`[page] could not read ${url}`, err instanceof Error ? err.message : err)
    return null
  }
}
