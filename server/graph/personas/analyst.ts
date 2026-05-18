import { loadItem, storeItem } from '../../utils/cache'
import {
  type AnalysedItem,
  AnalystExtractionSchema,
  type RawItem,
} from '../../utils/schemas'
import { extractStructured } from '../../utils/llm'
import type { RadarState } from '../state'

const SYSTEM = `You are the Analyst persona of UK AI Radar.

You read short extracts from UK government sources (gov.uk, UKRI, Parliament) and
extract a tight, factual structured record. You never speculate. If a field is not
stated in the source, return null (or empty array) — do not infer.

Rules:
- Quote money figures verbatim (e.g. "up to £500k").
- Deadlines must be explicit dates from the source. If none, return null.
- "kind" must reflect the primary nature of the document.
- "summary" is one or two neutral factual sentences.`

function userPrompt(item: RawItem): string {
  return [
    `Source: ${item.sourceHost}`,
    `URL: ${item.sourceUrl}`,
    `Title: ${item.title}`,
    item.publishedAt ? `Published: ${item.publishedAt}` : '',
    '',
    'Extract:',
    item.snippet || '(no snippet available — use title only)',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function analyst(state: RadarState): Promise<Partial<RadarState>> {
  const analysed: AnalysedItem[] = []
  let llmCalls = 0
  let reused = 0

  for (const item of state.rawItems) {
    const cached = loadItem(item.sourceUrl, item.contentHash)
    if (cached) {
      reused++
      analysed.push(cached)
      continue
    }

    try {
      const extraction = await extractStructured({
        system: SYSTEM,
        user: userPrompt(item),
        schema: AnalystExtractionSchema,
        toolName: 'record_item',
        toolDescription: 'Record the structured analysis of a single UK gov source item.',
        maxTokens: 600,
      })
      llmCalls++
      const full: AnalysedItem = { ...item, ...extraction }
      storeItem(full)
      analysed.push(full)
    } catch (err) {
      console.error(`[analyst] failed item ${item.sourceUrl}`, err)
    }
  }

  console.log(`[analyst] analysed=${analysed.length} reused=${reused} llm=${llmCalls}`)
  return {
    analysedItems: analysed,
    stats: {
      ...state.stats,
      analysed: state.stats.analysed + analysed.length,
      llmCalls: state.stats.llmCalls + llmCalls,
    },
  }
}
