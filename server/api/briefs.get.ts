import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const digestsDir = join(process.cwd(), 'digests')

interface BriefListing {
  profile: string
  date: string
  generatedAt: string
}

export default defineEventHandler(async (): Promise<BriefListing[]> => {
  let files: string[]
  try {
    files = await readdir(digestsDir)
  } catch {
    return []
  }

  const jsons = files.filter((f) => f.endsWith('.json'))
  const latest = new Map<string, BriefListing>()

  for (const f of jsons) {
    // filename pattern: YYYY-MM-DD.<profile>.json
    const m = /^(\d{4}-\d{2}-\d{2})\.(.+)\.json$/.exec(f)
    if (!m) continue
    const date = m[1]
    const profile = m[2]
    const s = await stat(join(digestsDir, f))
    const entry: BriefListing = { profile, date, generatedAt: s.mtime.toISOString() }
    const existing = latest.get(profile)
    if (!existing || existing.date < date) latest.set(profile, entry)
  }

  return [...latest.values()].sort((a, b) => (a.profile < b.profile ? -1 : 1))
})
