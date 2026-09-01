import { describe, expect, it } from 'vitest'
import { decodeEntities } from './text'

describe('decodeEntities', () => {
  it('decodes numeric, hex and named entities, including double-encoded ones', () => {
    expect(decodeEntities('Research &#038; Innovation')).toBe('Research & Innovation')
    expect(decodeEntities('Research &amp;#038; Innovation')).toBe('Research & Innovation')
    expect(decodeEntities('&#x2019;s &pound;5m &lt;b&gt;')).toBe('’s £5m <b>')
    expect(decodeEntities('plain')).toBe('plain')
  })
})
