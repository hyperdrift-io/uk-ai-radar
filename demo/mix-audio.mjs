/**
 * Lay the narration over the silent master at the beats the run produced.
 *
 * Beat times come from the transcript: each founder turn starts a beat, the
 * founder's on-screen action starts the "decide" beat, the draft_brief call the
 * "brief" beat, and the close sits two seconds before the end.
 */
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const OUT = resolve(process.env.DEMO_OUT ?? 'demo/out')
const NARR = resolve('demo/narration')
const master = `${OUT}/master.mp4`
const final = `${OUT}/uk-ai-radar-webmcp.mp4`

const transcript = JSON.parse(await readFile(`${OUT}/transcript.json`, 'utf8'))
const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', master]).toString())

// Wall-clock event time → time in the (possibly retimed) video.
const timemap = await readFile(`${OUT}/timemap.json`, 'utf8').then(JSON.parse).catch(() => null)
const toVideo = (wallSeconds) => {
  if (!timemap) return wallSeconds
  const frameSeconds = wallSeconds * (timemap.original / timemap.wall)
  let last = timemap.map[0]
  for (const row of timemap.map) { if (row[0] > frameSeconds) break; last = row }
  return last[1]
}
const at = (t) => toVideo(t.at / 1000)
const founderTurns = transcript.filter((t) => t.who === 'founder').map(at)
const actionEvent = transcript.find((t) => t.who === 'founder-action')
const action = actionEvent ? at(actionEvent) : undefined
const briefEvent = transcript.find((t) => t.who === 'agent' && /draft/i.test(t.text) && t.at / 1000 > 0 && founderTurns.length === 4 && at(t) > founderTurns[3])
const briefCall = briefEvent ? at(briefEvent) : undefined

const clipLen = (name) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${NARR}/${name}.wav`]).toString())

// name → start second. Narration sits just after the founder speaks, never over the next beat.
const beats = [
  ['open', 0.4],
  ['agent', Math.max(founderTurns[0] - 0.2, clipLen('open') + 1.2)],
  ['profile', founderTurns[0] + 6],
  ['shortlist', founderTurns[1] + 5],
  ['private', founderTurns[2] + 6.5],
  ['decide', action ? action + 1 : founderTurns[3] - 8],
  ['brief', briefCall ? briefCall + 1.5 : founderTurns[3] + 8],
  ['close', duration - clipLen('close') - 1.2],
].filter(([, at]) => Number.isFinite(at) && at >= 0 && at < duration)

// Push any clip that would overlap the previous one.
for (let i = 1; i < beats.length; i++) {
  const prevEnd = beats[i - 1][1] + clipLen(beats[i - 1][0]) + 0.6
  if (beats[i][1] < prevEnd) beats[i][1] = prevEnd
}

const inputs = beats.flatMap(([name]) => ['-i', `${NARR}/${name}.wav`])
const delays = beats.map(([, at], i) => `[${i + 1}:a]adelay=${Math.round(at * 1000)}|${Math.round(at * 1000)}[a${i}]`).join(';')
const mix = `${delays};${beats.map((_, i) => `[a${i}]`).join('')}amix=inputs=${beats.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, ...inputs, '-filter_complex', mix, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', final], { stdio: 'inherit' })
console.log(`[audio] ${beats.map(([n, at]) => `${n}@${at.toFixed(1)}s`).join('  ')}`)
console.log(`[audio] → ${final}`)
