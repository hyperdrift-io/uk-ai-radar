/**
 * Assemble the captured frames into an upload-ready master.
 *
 * Frames arrive when Chrome paints, not on a clock, so each is held for the gap
 * to the next before resampling to constant frame rate — real time, no invented
 * motion. Scaled to 16:9 1440p on the page's own background so the platform's
 * transcode ladder keeps the text sharp.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve(process.env.DEMO_OUT ?? 'demo/out')
const list = `${OUT}/frames.txt`
if (!existsSync(list)) throw new Error(`no frames at ${list} — run demo/agent.mjs first`)

const master = `${OUT}/master.mp4`
const captions = `${OUT}/captions.ass`
const base = 'fps=30,scale=2560:-2:flags=lanczos,pad=2560:1440:(ow-iw)/2:(oh-ih)/2:color=0xffffff'
const filter = `${base}${existsSync(captions) ? ",subtitles='captions.ass'" : ''},format=yuv420p`

execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf', filter, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-movflags', '+faststart', master], { stdio: 'inherit', cwd: OUT })

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,duration', '-show_entries', 'format=duration,size', '-of', 'json', master]).toString())
console.log(`[video] ${master}`)
console.log(`[video] ${probe.streams[0].width}x${probe.streams[0].height} · ${Number(probe.format.duration).toFixed(1)}s · ${(probe.format.size / 1e6).toFixed(1)} MB`)
if (Number(probe.format.duration) > 180) console.log('[video] WARNING: over the 3-minute cap — trim before upload')
