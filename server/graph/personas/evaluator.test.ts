import { describe, expect, it } from 'vitest'
import type { RankedItem } from '../../utils/schemas'
import { initialState } from '../state'
import { evaluator } from './evaluator'

const profile = {
  slug: 'cv',
  company: 'CV Co',
  stage: 'seed' as const,
  geo: 'United Kingdom',
  sectors: ['construction', 'engineering'],
  capabilities: ['computer vision', 'edge inference'],
  goals: ['secure non-dilutive funding'],
  exclude: [],
}

function make(p: Partial<RankedItem>): RankedItem {
  return {
    id: '1',
    sourceHost: 'www.gov.uk',
    sourceUrl: 'https://www.gov.uk/x',
    title: 'Computer vision grant for construction',
    fetchedAt: new Date().toISOString(),
    snippet: '',
    contentHash: 'h',
    kind: 'grant',
    body: 'Innovate UK',
    deadline: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    amount: 'up to £500k',
    eligibility: ['UK-registered SME'],
    summary: 'Funding for AI computer vision applications in the construction sector.',
    fitScore: 0.8,
    actionability: 0.7,
    rank: 1,
    angle: 'Direct fit: construction computer vision funding for UK SMEs.',
    kindColor: 'green',
    ...p,
  }
}

describe('evaluator', () => {
  it('attaches quality to every ranked item', () => {
    const state = { ...initialState(profile), rankedItems: [make({})] }
    const out = evaluator(state)
    expect(out.rankedItems![0].quality).toBeDefined()
  })

  it('scores a well-aligned item highly', () => {
    const state = { ...initialState(profile), rankedItems: [make({})] }
    const out = evaluator(state)
    expect(out.rankedItems![0].quality!.overall).toBeGreaterThan(0.5)
  })

  it('flags an item with no deadline and no amount', () => {
    const item = make({ deadline: null, amount: null, eligibility: [] })
    const state = { ...initialState(profile), rankedItems: [item] }
    const out = evaluator(state)
    const flags = out.rankedItems![0].quality!.flags
    expect(flags).toContain('no-deadline')
    expect(flags).toContain('no-amount')
    expect(flags).toContain('no-eligibility')
  })

  it('flags an angle that does not reference the profile', () => {
    const item = make({ angle: 'Generic statement about technology innovation.' })
    const state = { ...initialState(profile), rankedItems: [item] }
    const out = evaluator(state)
    expect(out.rankedItems![0].quality!.flags).toContain('angle-ignores-profile')
  })
})
