import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { recordAndDiff, resetCacheForTests } from './cache'

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
