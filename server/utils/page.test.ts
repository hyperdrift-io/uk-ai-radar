import { describe, expect, it } from 'vitest'
import { canReadPage, mainText } from './page'

describe('mainText', () => {
  it('keeps the main content, drops chrome and tags, decodes entities', () => {
    const html = `<html><head><style>x{}</style></head><body><header>Menu</header>
      <main><h1>Funding &amp; support</h1><nav>skip</nav><p>Closing date: 28 October 2026 11:00am UK time</p>
      <script>track()</script><ul><li>Total fund: £25,400,000</li></ul></main><footer>Crown</footer></body></html>`
    const text = mainText(html)
    expect(text).toContain('Funding & support')
    expect(text).toContain('Closing date: 28 October 2026')
    expect(text).toContain('Total fund: £25,400,000')
    expect(text).not.toContain('Menu')
    expect(text).not.toContain('Crown')
    expect(text).not.toContain('track()')
    expect(text).not.toContain('skip')
  })

  it('bounds the text', () => {
    expect(mainText(`<main>${'a'.repeat(10_000)}</main>`, 100)).toHaveLength(100)
  })
})

describe('canReadPage', () => {
  it('reads gov.uk and UKRI pages, leaves Hansard to the feed', () => {
    expect(canReadPage('https://www.gov.uk/government/consultations/x')).toBe(true)
    expect(canReadPage('https://www.ukri.org/opportunity/x/')).toBe(true)
    expect(canReadPage('https://hansard.parliament.uk/debates/x')).toBe(false)
    expect(canReadPage('not a url')).toBe(false)
  })
})
