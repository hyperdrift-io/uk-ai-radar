import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runRadar } from '../graph'
import { renderMarkdown } from '../utils/render'
import { type Digest, DigestSchema, ProfileSchema } from '../utils/schemas'

/**
 * Trigger a digest run for a given profile slug. Synchronous — the request waits
 * until the run completes. For typical fetches + ~10–30 items this finishes in
 * 20–60s. The handler writes both .json and .md to digests/.
 */
export default defineEventHandler(async (event) => {
  const { slug } = await readBody<{ slug?: string }>(event)
  if (!slug || typeof slug !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'slug required' })
  }

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
})
