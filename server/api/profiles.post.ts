import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import { ProfileSchema } from '../utils/schemas'

const ArrayFromTextSchema = z
  .union([z.array(z.string()), z.string()])
  .transform((v) =>
    Array.isArray(v) ? v : v.split('\n').map((l) => l.trim()).filter(Boolean),
  )

// Accept multiline textarea input by transforming strings → string[].
const FormSchema = ProfileSchema.extend({
  sectors: ArrayFromTextSchema,
  capabilities: ArrayFromTextSchema,
  goals: ArrayFromTextSchema,
  exclude: ArrayFromTextSchema,
  trl: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : Number(v))),
})

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const parsed = FormSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid profile',
      data: parsed.error.flatten(),
    })
  }
  const profile = parsed.data

  const path = resolve(`profiles/${profile.slug}.json`)
  await writeFile(path, JSON.stringify(profile, null, 2) + '\n', 'utf8')

  return { ok: true, slug: profile.slug, path: `profiles/${profile.slug}.json` }
})
