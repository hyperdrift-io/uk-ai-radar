import Anthropic from '@anthropic-ai/sdk'
import type { ZodTypeAny, z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

let _client: Anthropic | null = null

function client(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add a key.')
  }
  _client = new Anthropic({ apiKey })
  return _client
}

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

export interface ExtractOptions<S extends ZodTypeAny> {
  /** System prompt establishing persona + voice. */
  system: string
  /** User prompt with the item-specific context. */
  user: string
  /** Zod schema describing the structured output. */
  schema: S
  /** Tool name shown to the model. */
  toolName: string
  /** What the tool does, in plain English. */
  toolDescription: string
  /** Max output tokens. */
  maxTokens?: number
  /** Temperature; default 0 for analyst-style extraction. */
  temperature?: number
  /** Model override. */
  model?: string
}

/**
 * Single-shot structured extraction via Anthropic tool-use.
 *
 * Forces the model to call exactly one tool whose input schema is `schema`,
 * then validates the input through Zod and returns the parsed value.
 */
export async function extractStructured<S extends ZodTypeAny>(
  opts: ExtractOptions<S>,
): Promise<z.infer<S>> {
  const jsonSchema = zodToJsonSchema(opts.schema, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as Record<string, unknown>

  // Anthropic expects `input_schema` (object). Trim the wrapper keys.
  delete jsonSchema.$schema
  delete jsonSchema.definitions

  const response = await client().messages.create({
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0,
    system: opts.system,
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: jsonSchema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: opts.toolName },
    messages: [{ role: 'user', content: opts.user }],
  })

  const toolBlock = response.content.find((b) => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error(`model did not call tool ${opts.toolName}`)
  }
  return opts.schema.parse(toolBlock.input)
}
