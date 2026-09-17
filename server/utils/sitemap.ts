export const SITE = 'https://radar.hyperdrift.io'

export interface SitemapEntry {
  path: string
  /** YYYY-MM-DD, the day the page's content last changed. */
  lastmod: string
}

/** Public pages and the day each last changed; move a date only when the page does. /new-profile is a gated form, not a page to index. */
export const STATIC_PAGES: SitemapEntry[] = [
  { path: '/', lastmod: '2026-09-02' },
  { path: '/explore', lastmod: '2026-09-02' },
  { path: '/sources', lastmod: '2026-09-02' },
  { path: '/about', lastmod: '2026-09-02' },
]

/** Static pages plus one entry per published brief. The home page lists the briefs, so it is as fresh as the newest one. */
export function sitemapEntries(briefs: { profile: string; date: string }[]): SitemapEntry[] {
  const newest = briefs.reduce((max, b) => (b.date > max ? b.date : max), '')
  return [
    ...STATIC_PAGES.map((p) => (p.path === '/' && newest > p.lastmod ? { ...p, lastmod: newest } : p)),
    ...briefs.map((b) => ({ path: `/brief/${encodeURIComponent(b.profile)}`, lastmod: b.date })),
  ]
}

export function sitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => `  <url><loc>${SITE}${e.path}</loc><lastmod>${e.lastmod}</lastmod></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
