import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const digestsDir = join(process.cwd(), 'digests')

export default defineEventHandler(async (event) => {
  const profile = getRouterParam(event, 'profile')
  if (!profile) {
    throw createError({ statusCode: 400, statusMessage: 'profile required' })
  }

  let files: string[]
  try {
    files = await readdir(digestsDir)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'no digests generated yet' })
  }

  const match = files
    .filter((f) => f.endsWith(`.${profile}.json`))
    .sort()
    .pop()

  if (!match) {
    throw createError({ statusCode: 404, statusMessage: `no brief for profile "${profile}"` })
  }

  const raw = await readFile(join(digestsDir, match), 'utf8')
  return JSON.parse(raw)
})
