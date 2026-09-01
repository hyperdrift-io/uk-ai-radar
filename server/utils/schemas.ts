import { z } from 'zod'

// ---- Profile (founder input) ----

export const ProfileSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be url-safe (a-z, 0-9, -)'),
  company: z.string().min(1),
  stage: z.enum(['pre-seed', 'seed', 'series-a', 'series-b', 'later']),
  geo: z.string().min(1),
  sectors: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]).describe('what the company DOES technically — e.g. "computer vision", "LLM agents"'),
  trlBand: z
    .enum(['research', 'prototype', 'deployment'])
    .optional()
    .describe(
      'Maturity band — maps internally to TRL: research=1–3 (basic R&D, UKRI / ARIA), ' +
        'prototype=4–6 (working prototype, the Innovate UK Smart Grant sweet spot), ' +
        'deployment=7–9 (commercial scale; contracts not grants).',
    ),
  goals: z.array(z.string()).default([]),
  exclude: z.array(z.string()).default([]),
})
export type Profile = z.infer<typeof ProfileSchema>

// ---- Raw item (Scout output, after fetch + diff) ----

export const SourceHostSchema = z.enum([
  'www.gov.uk',
  'www.ukri.org',
  'apply-for-innovation-funding.service.gov.uk',
  'developer.parliament.uk',
  'hansard.parliament.uk',
  'committees.parliament.uk',
])
export type SourceHost = z.infer<typeof SourceHostSchema>

export const RawItemSchema = z.object({
  id: z.string(), // stable hash of canonical URL
  sourceHost: SourceHostSchema,
  sourceUrl: z.string().url(),
  title: z.string(),
  publishedAt: z.string().datetime().optional(),
  fetchedAt: z.string().datetime(),
  snippet: z.string().default(''), // bounded extract for the Analyst, never republished as content
  contentHash: z.string(),
})
export type RawItem = z.infer<typeof RawItemSchema>

// ---- Analysed item (Analyst output) ----

export const ItemKindSchema = z.enum([
  'grant',
  'tender',
  'consultation',
  'policy',
  'guidance',
  'committee',
  'other',
])
export type ItemKind = z.infer<typeof ItemKindSchema>

export const AnalysedItemSchema = RawItemSchema.extend({
  kind: ItemKindSchema,
  body: z.string().nullable().describe('issuing department / agency / committee'),
  deadline: z.string().date().nullable(),
  amount: z.string().nullable().describe('e.g. "up to £500k" — verbatim from source if present'),
  eligibility: z.array(z.string()).default([]),
  summary: z.string().describe('neutral 1–2 sentence factual summary'),
  readDepth: z
    .enum(['page', 'feed'])
    .optional()
    .describe('"page" when the analyst read the full source page; "feed" when only the feed entry was available'),
})
export type AnalysedItem = z.infer<typeof AnalysedItemSchema>

// Schema used as the Anthropic tool-input shape — strip transport-level fields.
export const AnalystExtractionSchema = AnalysedItemSchema.pick({
  kind: true,
  body: true,
  deadline: true,
  amount: true,
  eligibility: true,
  summary: true,
})
export type AnalystExtraction = z.infer<typeof AnalystExtractionSchema>

// ---- Ranked item (Strategist + Editor output) ----

export const QualityFlagSchema = z.enum([
  'no-deadline',
  'no-amount',
  'no-eligibility',
  'thin-summary',
  'angle-not-grounded',
  'angle-ignores-profile',
  'past-deadline',
])
export type QualityFlag = z.infer<typeof QualityFlagSchema>

export const QualitySchema = z.object({
  citationGrounding: z.number().min(0).max(1),
  profileCoherence: z.number().min(0).max(1),
  actionabilityHonesty: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
  flags: z.array(QualityFlagSchema).default([]),
})
export type Quality = z.infer<typeof QualitySchema>

export const RankedItemSchema = AnalysedItemSchema.extend({
  fitScore: z.number().min(0).max(1).describe('0–1 fit to the active profile'),
  actionability: z.number().min(0).max(1).describe('0–1 how concrete the next step is'),
  rank: z.number().int().min(1).describe('1-indexed final rank'),
  angle: z.string().describe('per-profile "so what?" angle, 1–3 sentences'),
  kindColor: z.enum(['blue', 'green', 'turquoise', 'purple', 'pink', 'orange', 'grey']),
  quality: QualitySchema.optional(),
})
export type RankedItem = z.infer<typeof RankedItemSchema>

export const StrategistAssessmentSchema = z.object({
  fitScore: RankedItemSchema.shape.fitScore,
  actionability: RankedItemSchema.shape.actionability,
  angle: RankedItemSchema.shape.angle,
})
export type StrategistAssessment = z.infer<typeof StrategistAssessmentSchema>

// ---- Digest (final brief) ----

export const DigestSchema = z.object({
  profile: z.string(), // slug
  generatedAt: z.string().datetime(),
  itemCount: z.number().int().min(0),
  items: z.array(RankedItemSchema),
})
export type Digest = z.infer<typeof DigestSchema>

// Convenience — map kind to GOV.UK tag colour for the UI.
export function kindColor(kind: ItemKind): RankedItem['kindColor'] {
  switch (kind) {
    case 'grant':
      return 'green'
    case 'tender':
      return 'turquoise'
    case 'consultation':
      return 'purple'
    case 'policy':
      return 'blue'
    case 'guidance':
      return 'pink'
    case 'committee':
      return 'orange'
    default:
      return 'grey'
  }
}
