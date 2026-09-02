/**
 * Demo harness: a real agent works the live page through WebMCP.
 *
 * Chrome (WebMCP on) opens radar.hyperdrift.io. The agent discovers the page's
 * tools with document.modelContext.getTools(), decides what to call, and calls
 * them with document.modelContext.executeTool(). Nothing is faked: the tool list,
 * the schemas and the results all come from the page.
 *
 * Frames are captured over CDP at deviceScaleFactor 2 and written with their
 * paint timestamps, so the assembled video keeps real time.
 */
import { chromium } from 'playwright'
import Anthropic from '@anthropic-ai/sdk'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const URL = process.env.DEMO_URL ?? 'https://radar.hyperdrift.io/explore'
const OUT = resolve(process.env.DEMO_OUT ?? 'demo/out')
const VIEWPORT = { width: 1440, height: 900 }
const MODEL = process.env.DEMO_MODEL ?? 'claude-sonnet-4-6'

const SYSTEM = `You are the founder's own agent, working beside them in their browser on UK AI Radar.

The founder is Carepath AI: seed stage, UK, builds medical imaging models and LLM agents on FHIR data pipelines, sells into the NHS and diagnostics. Their goal this quarter is a first NHS pilot and clarity on the regulatory path for AI as a medical device. They do not want academic-only grants.

The page offers you tools. Use them. Rules that matter:
- The founder is watching the screen. Every tool call changes what they see, so work in a sensible order and do not thrash.
- Read the workspace before you suggest, and again after the founder acts, so you never repeat a suggestion they turned down.
- When you suggest something, ground the angle in the item itself and give one concrete next step with the real date.
- Be brief between calls. One short line of what you are doing and why. No lists, no preamble.`

const TURNS = [
  "Set up my profile on this page from what you know about us.",
  "Now go through everything on the radar and shortlist what we should act on this month. For each one, why it fits us and the one next step. Set aside anything that is only for universities or has nothing to apply for, with the reason.",
  "I dropped the connectivity contract — we don't sell into community sites. Read what I kept and dropped, then draft the brief.",
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY required')
  await rm(OUT, { recursive: true, force: true })
  await mkdir(`${OUT}/frames`, { recursive: true })

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--enable-features=WebMCP', '--hide-scrollbars', '--force-device-scale-factor=1'],
  })
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
  const page = await context.newPage()

  const cdp = await context.newCDPSession(page)
  const frames = []
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, ts: metadata.timestamp })
    try { await cdp.send('Page.screencastFrameAck', { sessionId }) } catch {}
  })

  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('uk-ai-radar.workspace.v1'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.querySelectorAll('section[data-kind]').length > 0, { timeout: 30_000 })

  const tools = await readTools(page)
  console.log(`[demo] page offers ${tools.length} tools: ${tools.map((t) => t.name).join(', ')}`)

  await cdp.send('Page.startScreencast', { format: 'png', maxWidth: VIEWPORT.width * 2, maxHeight: VIEWPORT.height * 2, everyNthFrame: 1 })
  const startedAt = Date.now()
  await sleep(2500) // hold on the cold page

  const anthropic = new Anthropic({ apiKey })
  const messages = []
  const transcript = []
  const say = (who, text) => { transcript.push({ who, text, at: Date.now() - startedAt }); console.log(`[${who}] ${text}`) }

  for (const turn of TURNS) {
    say('founder', turn)
    messages.push({ role: 'user', content: turn })
    await sleep(1200)

    for (let step = 0; step < 24; step++) {
      const res = await anthropic.messages.create({ model: MODEL, max_tokens: 1500, system: SYSTEM, tools: await currentTools(page, tools), messages })
      messages.push({ role: 'assistant', content: res.content })
      for (const block of res.content) if (block.type === 'text' && block.text.trim()) say('agent', block.text.trim())
      const calls = res.content.filter((b) => b.type === 'tool_use')
      if (calls.length === 0) break

      const results = []
      for (const call of calls) {
        console.log(`[tool] ${call.name} ${JSON.stringify(call.input).slice(0, 120)}`)
        const out = await page.evaluate(
          async ([name, input]) => {
            const tool = (await document.modelContext.getTools()).find((t) => t.name === name)
            if (!tool) return { error: `no tool named ${name}` }
            const raw = await document.modelContext.executeTool(tool, JSON.stringify(input))
            return typeof raw === 'string' ? JSON.parse(raw) : raw
          },
          [call.name, call.input],
        )
        results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(out).slice(0, 12_000) })
        await sleep(900) // let the founder see the page move
      }
      messages.push({ role: 'user', content: results })
    }

    // The founder acts between turns, on screen.
    if (transcript.filter((t) => t.who === 'founder').length === 2) {
      const dropped = await page.evaluate(async () => {
        const weak = [...document.querySelectorAll('section[data-mark="suggested"]')].find((c) => c.querySelector('blockquote[data-fit="weak"]')) ?? document.querySelector('section[data-mark="suggested"]')
        if (!weak) return null
        weak.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await new Promise((r) => setTimeout(r, 900))
        weak.querySelector('button[value="drop"]').click()
        await new Promise((r) => setTimeout(r, 600))
        const input = weak.querySelector('input[name="reason"]')
        if (input) {
          for (const ch of "we don't sell into community sites") { input.value += ch; await new Promise((r) => setTimeout(r, 45)) }
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }
        return weak.querySelector('h2').textContent
      })
      if (dropped) say('founder-action', `dropped: ${dropped}`)
      await sleep(1500)
    }
  }

  await sleep(2500)
  await cdp.send('Page.stopScreencast')
  await browser.close()

  let i = 0
  const lines = []
  for (const f of frames) {
    const name = `frames/f${String(i).padStart(5, '0')}.png`
    await writeFile(`${OUT}/${name}`, Buffer.from(f.data, 'base64'))
    const next = frames[i + 1]
    lines.push(`file '${name}'`, `duration ${Math.max(0.033, (next ? next.ts - f.ts : 0.2)).toFixed(3)}`)
    i++
  }
  lines.push(`file 'frames/f${String(i - 1).padStart(5, '0')}.png'`)
  await writeFile(`${OUT}/frames.txt`, lines.join('\n'))
  await writeFile(`${OUT}/transcript.json`, JSON.stringify(transcript, null, 2))
  console.log(`[demo] ${frames.length} frames over ${((Date.now() - startedAt) / 1000).toFixed(1)}s → ${OUT}`)
}

/**
 * The tool list as the model needs it. The browser serialises inputSchema to a
 * JSON string, so parse it back. Re-read every step: the page registers
 * draft_brief only once a shortlist exists.
 */
async function readTools(page) {
  const raw = await page.evaluate(async () =>
    (await document.modelContext.getTools()).map((t) => ({ name: t.name, description: t.description, schema: t.inputSchema })),
  )
  return raw.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: typeof t.schema === 'string' ? JSON.parse(t.schema) : (t.schema ?? { type: 'object', properties: {} }),
  }))
}

async function currentTools(page, initial) {
  const live = await readTools(page)
  return live.length ? live : initial
}

main().catch((err) => { console.error(err); process.exit(1) })
