import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AnalysedItem } from './schemas'
import { listItems, listSourceHosts, loadItem, recordAndDiff, resetCacheForTests, storeItem } from './cache'

let tmpDir: string
let originalCwd: string

beforeEach(() => {
  originalCwd = process.cwd()
  tmpDir = mkdtempSync(join(tmpdir(), 'uk-ai-radar-cache-'))
  process.chdir(tmpDir)
  resetCacheForTests()
})

afterEach(() => {
  resetCacheForTests()
  process.chdir(originalCwd)
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('recordAndDiff', () => {
  it('reports changed=true on first sight of a URL', () => {
    const r = recordAndDiff('https://www.gov.uk/a', 'hello')
    expect(r.changed).toBe(true)
  })

  it('reports changed=false when content is identical', () => {
    recordAndDiff('https://www.gov.uk/a', 'hello')
    const r = recordAndDiff('https://www.gov.uk/a', 'hello')
    expect(r.changed).toBe(false)
  })

  it('reports changed=true when content differs', () => {
    recordAndDiff('https://www.gov.uk/a', 'hello')
    const r = recordAndDiff('https://www.gov.uk/a', 'hello v2')
    expect(r.changed).toBe(true)
  })

  it('returns a stable hash for the same content', () => {
    const a = recordAndDiff('https://www.gov.uk/a', 'hello')
    const b = recordAndDiff('https://www.gov.uk/b', 'hello')
    expect(a.hash).toBe(b.hash)
  })
})

const item = (over: Partial<AnalysedItem>): AnalysedItem => ({
  id: 'x',
  sourceHost: 'www.gov.uk',
  sourceUrl: 'https://www.gov.uk/x',
  title: 'Untitled',
  fetchedAt: '2026-09-01T00:00:00.000Z',
  snippet: '',
  contentHash: 'h1',
  kind: 'other',
  body: null,
  deadline: null,
  amount: null,
  eligibility: [],
  summary: '',
  ...over,
})

describe('items', () => {
  it('lists stored items soonest deadline first, undated last, within the limit', () => {
    storeItem(item({ sourceUrl: 'https://www.gov.uk/a', title: 'undated' }))
    storeItem(item({ sourceUrl: 'https://www.ukri.org/b', sourceHost: 'www.ukri.org', title: 'october', deadline: '2026-10-01' }))
    storeItem(item({ sourceUrl: 'https://www.gov.uk/c', title: 'september', deadline: '2026-09-10' }))
    expect(listItems().map((i) => i.title)).toEqual(['september', 'october', 'undated'])
    expect(listItems(1).map((i) => i.title)).toEqual(['september'])
    expect(listSourceHosts()).toEqual(['www.gov.uk', 'www.ukri.org'])
  })

  it('reuses an analysed item only while its source hash matches', () => {
    storeItem(item({ sourceUrl: 'https://www.gov.uk/a', contentHash: 'h1', title: 'v1' }))
    expect(loadItem('https://www.gov.uk/a', 'h1')?.title).toBe('v1')
    expect(loadItem('https://www.gov.uk/a', 'h2')).toBeNull()
    expect(loadItem('https://www.gov.uk/missing', 'h1')).toBeNull()
  })
})
