/**
 * Turn the run transcript into burned-in captions.
 *
 * The recording shows the page, not the chat window, so the viewer needs to see
 * the founder's side of the conversation and the agent's replies. Two styles:
 * what the founder types, and what the agent says back.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const OUT = resolve(process.env.DEMO_OUT ?? 'demo/out')
const HOLD_MIN = 2.2
const HOLD_PER_WORD = 0.34

const stamp = (s) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = (s % 60).toFixed(2).padStart(5, '0')
  return `${h}:${String(m).padStart(2, '0')}:${sec}`
}

const wrap = (text, width = 62) => {
  const out = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > width) { out.push(line.trim()); line = word } else line += ' ' + word
  }
  if (line.trim()) out.push(line.trim())
  return out.slice(0, 3).join('\\N')
}

const transcript = JSON.parse(await readFile(`${OUT}/transcript.json`, 'utf8'))
const lines = transcript
  .filter((t) => t.who !== 'founder-action')
  .map((t) => ({ ...t, start: t.at / 1000, text: t.text.replace(/\s+/g, ' ').trim() }))

const events = lines.map((line, i) => {
  const words = line.text.split(/\s+/).length
  const natural = Math.max(HOLD_MIN, words * HOLD_PER_WORD)
  const next = lines[i + 1]
  const end = next ? Math.min(line.start + natural, next.start - 0.15) : line.start + natural
  const style = line.who === 'founder' ? 'Founder' : 'Agent'
  const prefix = line.who === 'founder' ? 'You: ' : 'Your agent: '
  return `Dialogue: 0,${stamp(line.start)},${stamp(Math.max(end, line.start + 1))},${style},,0,0,0,,${wrap(prefix + line.text)}`
})

const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 2560
PlayResY: 1440
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Founder,Helvetica Neue,46,&H00FFFFFF,&H00000000,&HC00C0C0B,1,0,3,14,0,2,180,180,72,1
Style: Agent,Helvetica Neue,44,&H00FFFFFF,&H00000000,&HC0B8701D,0,0,3,14,0,2,180,180,72,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, Effect, Text
${events.join('\n')}
`

await writeFile(`${OUT}/captions.ass`, ass)
console.log(`[captions] ${events.length} lines → ${OUT}/captions.ass`)
