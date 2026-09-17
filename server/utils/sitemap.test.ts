import { describe, expect, it } from 'vitest'
import { sitemapEntries, sitemapXml } from './sitemap'

describe('sitemap', () => {
  it('lists the static pages and each brief under its own date', () => {
    const entries = sitemapEntries([{ profile: 'example', date: '2026-09-01' }])
    expect(entries.map((e) => e.path)).toEqual(['/', '/explore', '/sources', '/about', '/brief/example'])
    expect(entries.at(-1)?.lastmod).toBe('2026-09-01')
  })

  it('dates the home page by the newest brief it lists', () => {
    expect(sitemapEntries([{ profile: 'a', date: '2026-10-05' }])[0].lastmod).toBe('2026-10-05')
    expect(sitemapEntries([{ profile: 'a', date: '2026-01-01' }])[0].lastmod).toBe('2026-09-02')
  })

  it('writes absolute production URLs and encodes profile names', () => {
    const xml = sitemapXml(sitemapEntries([{ profile: 'r&d co', date: '2026-09-01' }]))
    expect(xml).toContain('<loc>https://radar.hyperdrift.io/</loc>')
    expect(xml).toContain('<loc>https://radar.hyperdrift.io/brief/r%26d%20co</loc>')
  })
})
