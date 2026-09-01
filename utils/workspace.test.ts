import { describe, expect, it } from 'vitest'
import type { AnalysedItem } from '../server/utils/schemas'
import { compactItem, emptyWorkspace, filterItems, listItems, normaliseProfile, renderBrief, shortlist } from './workspace'

const now = new Date('2026-09-02T00:00:00Z')

function item(over: Partial<AnalysedItem>): AnalysedItem {
  return {
    id: 'x',
    sourceHost: 'www.gov.uk',
    sourceUrl: 'https://www.gov.uk/x',
    title: 'Untitled',
    fetchedAt: now.toISOString(),
    snippet: '',
    contentHash: 'h',
    kind: 'other',
    body: null,
    deadline: null,
    amount: null,
    eligibility: [],
    summary: '',
    ...over,
  }
}

const grant = item({ sourceUrl: 'https://www.ukri.org/g', sourceHost: 'www.ukri.org', kind: 'grant', title: 'NHS imaging grant', deadline: '2026-09-20', amount: 'up to £500k' })
const policy = item({ sourceUrl: 'https://www.gov.uk/p', kind: 'policy', title: 'AI assurance policy paper', summary: 'Sets out the assurance roadmap.' })
const closed = item({ sourceUrl: 'https://www.gov.uk/c', kind: 'consultation', title: 'Closed consultation', deadline: '2026-08-01' })

describe('filterItems', () => {
  it('matches every query word across title, summary and body', () => {
    expect(filterItems([grant, policy], { query: 'assurance roadmap', kinds: [], deadline: 'any', sources: [] }, now)).toEqual([policy])
  })
  it('filters by kind, source and deadline window', () => {
    expect(filterItems([grant, policy, closed], { query: '', kinds: ['grant'], deadline: 'any', sources: [] }, now)).toEqual([grant])
    expect(filterItems([grant, policy, closed], { query: '', kinds: [], deadline: 'any', sources: ['www.ukri.org'] }, now)).toEqual([grant])
    expect(filterItems([grant, policy, closed], { query: '', kinds: [], deadline: 'closing-soon', sources: [] }, now)).toEqual([grant])
    expect(filterItems([grant, policy, closed], { query: '', kinds: [], deadline: 'closed', sources: [] }, now)).toEqual([closed])
    expect(filterItems([grant, policy, closed], { query: '', kinds: [], deadline: 'open', sources: [] }, now)).toEqual([grant, policy])
  })
})

describe('marks', () => {
  it('hides set-aside items from the list and orders kept before suggested in the shortlist', () => {
    const ws = emptyWorkspace()
    ws.marks[grant.sourceUrl] = { status: 'suggested', by: 'agent' }
    ws.marks[policy.sourceUrl] = { status: 'kept', by: 'founder' }
    ws.marks[closed.sourceUrl] = { status: 'aside', by: 'agent', reason: 'closed' }
    expect(listItems([grant, policy, closed], ws, now)).toEqual([grant, policy])
    expect(shortlist([grant, policy, closed], ws).map((i) => i.title)).toEqual([policy.title, grant.title])
  })
})

describe('compactItem', () => {
  it('reports days to deadline and the marks the agent needs', () => {
    const ws = emptyWorkspace()
    ws.reads[grant.sourceUrl] = { fit: 'strong', angle: 'a', nextStep: 'n', at: now.toISOString() }
    expect(compactItem(grant, ws, now)).toMatchObject({ daysUntilDeadline: 18, agentFit: 'strong', mark: null, amount: 'up to £500k' })
  })
})

describe('normaliseProfile', () => {
  it('accepts lists as arrays or comma text', () => {
    expect(normaliseProfile({ company: ' Acme ', sectors: 'health, NHS', goals: ['pilot'] })).toEqual({
      company: 'Acme',
      stage: '',
      sectors: ['health', 'NHS'],
      capabilities: [],
      goals: ['pilot'],
      exclude: [],
    })
  })
})

describe('renderBrief', () => {
  it('writes the shortlist with the agent read and the founder note', () => {
    const ws = emptyWorkspace()
    ws.profile = normaliseProfile({ company: 'Carepath' })
    ws.marks[grant.sourceUrl] = { status: 'kept', by: 'founder', note: 'Ask Sam about the NHS partner.' }
    ws.reads[grant.sourceUrl] = { fit: 'strong', angle: 'Imaging is our core.', nextStep: 'Draft the outline.', at: now.toISOString() }
    const md = renderBrief([grant, policy], ws, now)
    expect(md).toContain('# UK AI Radar brief for Carepath')
    expect(md).toContain('## NHS imaging grant')
    expect(md).toContain('closes 2026-09-20 (18d)')
    expect(md).toContain('**Fit: strong.** Imaging is our core.')
    expect(md).toContain('> Ask Sam about the NHS partner.')
    expect(md).not.toContain('AI assurance policy paper')
  })
})
