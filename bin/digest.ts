#!/usr/bin/env tsx
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runRadar } from '../server/graph'
import { renderMarkdown } from '../server/utils/render'
import { type Digest, DigestSchema, ProfileSchema } from '../server/utils/schemas'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const profilePath = arg('--profile') ?? 'profiles/example.json'
  const profileRaw = await readFile(resolve(profilePath), 'utf8')
  const profile = ProfileSchema.parse(JSON.parse(profileRaw))

  console.log(`[radar] profile=${profile.slug} (${profile.company})`)
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

  console.log('\n[radar] stats:', JSON.stringify(final.stats, null, 2))
  console.log(`[radar] wrote ${base}.json + ${base}.md`)
}

main().catch((err) => {
  console.error('[radar] failed:', err)
  process.exit(1)
})
