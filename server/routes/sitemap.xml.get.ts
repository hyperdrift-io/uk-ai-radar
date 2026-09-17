import { sitemapEntries, sitemapXml } from '../utils/sitemap'

// Built per request so a new brief is in the sitemap the moment its digest lands.
export default defineEventHandler(async (event) => {
  const briefs = await $fetch('/api/briefs')
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return sitemapXml(sitemapEntries(briefs))
})
