import {
  type AnalysedItem,
  kindColor,
  type Profile,
  type RankedItem,
  StrategistAssessmentSchema,
} from '../../utils/schemas'
import { extractStructured } from '../../utils/llm'
import type { RadarState } from '../state'

const SYSTEM = `You are the Strategist persona of UK AI Radar.

You read a single analysed UK gov item plus a founder profile, and decide:
- fitScore (0–1): how relevant this item is to the founder.
- actionability (0–1): how concrete the next step would be (apply, respond, bid).
- angle: 1–3 sentences in plain English explaining WHY this matters to THIS founder.

Be honest. If the item is irrelevant, fitScore should be near 0.
The angle must reference the profile (sector, stage, geo, stack, goals) explicitly.`

function userPrompt(item: AnalysedItem, profile: Profile): string {
  return [
    'Founder profile:',
    JSON.stringify(profile, null, 2),
    '',
    'Analysed item:',
    JSON.stringify(
      {
        kind: item.kind,
        title: item.title,
        body: item.body,
        deadline: item.deadline,
        amount: item.amount,
        eligibility: item.eligibility,
        summary: item.summary,
      },
      null,
      2,
    ),
  ].join('\n')
}

export async function strategist(state: RadarState): Promise<Partial<RadarState>> {
  const ranked: RankedItem[] = []
  let llmCalls = 0

  for (const item of state.analysedItems) {
    try {
      const assessment = await extractStructured({
        system: SYSTEM,
        user: userPrompt(item, state.profile),
        schema: StrategistAssessmentSchema,
        toolName: 'assess_item',
        toolDescription: 'Assess fit, actionability and write a per-profile angle for an item.',
        maxTokens: 400,
        temperature: 0.3,
      })
      llmCalls++
      ranked.push({
        ...item,
        ...assessment,
        rank: 0, // Editor assigns final rank
        kindColor: kindColor(item.kind),
      })
    } catch (err) {
      console.error(`[strategist] failed item ${item.sourceUrl}`, err)
    }
  }

  console.log(`[strategist] ranked-candidates=${ranked.length}/${state.analysedItems.length}`)
  return {
    rankedItems: ranked,
    stats: { ...state.stats, llmCalls: state.stats.llmCalls + llmCalls },
  }
}
