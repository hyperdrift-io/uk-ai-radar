/**
 * Cap the static holds. While the model thinks, Chrome paints nothing, so a
 * single frame can sit for 20 seconds. Capping a hold cuts waiting, never motion:
 * every painted frame stays, in order, at real speed. Writes frames.txt with the
 * capped durations and timemap.json so the narration lands on the same beats.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const OUT = resolve(process.env.DEMO_OUT ?? 'demo/out')
const CAP = Number(process.env.DEMO_HOLD_CAP ?? 4)
const WALL = Number(process.env.DEMO_WALL_SECONDS ?? 0) // run length by wall clock, for scaling event times

const lines = (await readFile(`${OUT}/frames.raw.txt`, 'utf8').catch(() => readFile(`${OUT}/frames.txt`, 'utf8'))).split('\n')
await writeFile(`${OUT}/frames.raw.txt`, lines.join('\n'))

const out = []
const map = [] // [originalCumulative, cappedCumulative]
let orig = 0
let capped = 0
for (const line of lines) {
  if (line.startsWith('duration')) {
    const d = Number(line.split(' ')[1])
    map.push([orig, capped])
    orig += d
    capped += Math.min(d, CAP)
    out.push(`duration ${Math.min(d, CAP).toFixed(3)}`)
  } else out.push(line)
}
map.push([orig, capped])
await writeFile(`${OUT}/frames.txt`, out.join('\n'))
await writeFile(`${OUT}/timemap.json`, JSON.stringify({ cap: CAP, original: orig, capped, wall: WALL || orig, map }))
console.log(`[retime] holds capped at ${CAP}s: ${orig.toFixed(1)}s → ${capped.toFixed(1)}s`)
