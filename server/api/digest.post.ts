import { requireAdmin } from '../utils/auth'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runRadar } from '../graph'
import { renderMarkdown } from '../utils/render'
import { type Digest, DigestSchema, ProfileSchema } from '../utils/schemas'

// One run at a time: a run reads pages and calls the model per item, so it takes
// minutes and costs money. A second request while one is running gets a 409.
let running: string | null = null

/**
 * Trigger a digest run for a given profile slug. Synchronous — the request waits
 * until the run completes (minutes, not seconds, now that the analyst reads pages).
 * Writes both .json and .md to digests/.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{ slug?: unknown }>(event)
  const parsed = ProfileSchema.shape.slug.safeParse(body?.slug)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'slug required (a-z, 0-9, -)' })
  }
  const slug = parsed.data
  if (running) {
    throw createError({ statusCode: 409, statusMessage: `a run for "${running}" is already in progress — try again when it finishes` })
  }
  running = slug
  try {
    return await runDigest(slug)
  } finally {
    running = null
  }
})

async function runDigest(slug: string) {

  let profileRaw: string
  try {
    profileRaw = await readFile(resolve(`profiles/${slug}.json`), 'utf8')
  } catch {
    throw createError({ statusCode: 404, statusMessage: `no profile profiles/${slug}.json` })
  }
  const profile = ProfileSchema.parse(JSON.parse(profileRaw))

  const final = await runRadar(profile)

  const digest: Digest = DigestSchema.parse({
    profile: profile.slug,
    generatedAt: new Date().toISOString(),
    itemCount: final.rankedItems.length,
    items: final.rankedItems,
  })

  const date = new Date(digest.generatedAt).toISOString().slice(0, 10)
  const base = `digests/${date}.${profile.slug}`
  await writeFile(`${base}.json`, JSON.stringify(digest, null, 2))
  await writeFile(`${base}.md`, renderMarkdown(digest))

  return { ok: true, slug: profile.slug, stats: final.stats, itemCount: digest.itemCount }
}
