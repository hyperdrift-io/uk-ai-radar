import { describe, expect, it } from 'vitest'
import type { RankedItem } from '../../utils/schemas'
import { editor } from './editor'
import { initialState } from '../state'

const profile = {
  slug: 'test',
  company: 'Test',
  stage: 'seed' as const,
  geo: 'UK',
  sectors: [],
  stack: [],
  goals: [],
  exclude: [],
}

function make(partial: Partial<RankedItem>): RankedItem {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2, 10),
    sourceHost: 'www.gov.uk',
    sourceUrl: 'https://www.gov.uk/x',
    title: 't',
    fetchedAt: new Date().toISOString(),
    snippet: '',
    contentHash: 'hash',
    kind: 'grant',
    body: null,
    deadline: null,
    amount: null,
    eligibility: [],
    summary: 's',
    fitScore: 0.5,
    actionability: 0.5,
    rank: 0,
    angle: 'a',
    kindColor: 'green',
    ...partial,
  }
}

describe('editor', () => {
  it('drops items below the fit floor', () => {
    const state = { ...initialState(profile), rankedItems: [make({ fitScore: 0.1 }), make({ fitScore: 0.9 })] }
    const out = editor(state)
    expect(out.rankedItems).toHaveLength(1)
    expect(out.rankedItems![0].fitScore).toBe(0.9)
  })

  it('ranks deterministically: higher composite first', () => {
    const a = make({ id: 'a', fitScore: 0.9, actionability: 0.9, deadline: null })
    // b has lower fit but imminent deadline.
    const b = make({
      id: 'b',
      title: 'another item',
      fitScore: 0.5,
      actionability: 0.5,
      deadline: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    })
    const state = { ...initialState(profile), rankedItems: [b, a] }
    const out = editor(state)
    expect(out.rankedItems!.map((i) => i.id)).toEqual(['a', 'b'])
    expect(out.rankedItems!.map((i) => i.rank)).toEqual([1, 2])
  })

  it('keeps at most three low-actionability signal items and dedupes repeated titles', () => {
    const debates = ['a', 'b', 'c', 'd', 'e'].map((id) =>
      make({ id, title: `Artificial Intelligence: Legislation ${id}`, fitScore: 0.5, actionability: 0.1 }),
    )
    const repeat = make({ id: 'f', title: 'Artificial Intelligence: Legislation a', fitScore: 0.4, actionability: 0.1 })
    const grant = make({ id: 'g', title: 'Grant', fitScore: 0.5, actionability: 0.8 })
    const out = editor({ ...initialState(profile), rankedItems: [...debates, repeat, grant] })
    expect(out.rankedItems!.map((i) => i.id)).toEqual(['g', 'a', 'b', 'c'])
  })

  it('dedupes by id keeping the higher composite', () => {
    const lo = make({ id: 'same', fitScore: 0.4 })
    const hi = make({ id: 'same', fitScore: 0.9 })
    const state = { ...initialState(profile), rankedItems: [lo, hi] }
    const out = editor(state)
    expect(out.rankedItems).toHaveLength(1)
    expect(out.rankedItems![0].fitScore).toBe(0.9)
  })
})
