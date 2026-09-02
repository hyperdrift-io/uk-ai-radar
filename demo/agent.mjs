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
// 16:9 at capture time, so the 1440p master needs no crop and no pillarbox.
const VIEWPORT = { width: 1600, height: 900 }
const MODEL = process.env.DEMO_MODEL ?? 'claude-sonnet-4-6'

const SYSTEM = `You are the founder's own agent, working beside them in their browser on UK AI Radar.

The founder is Carepath AI: seed stage, UK, builds medical imaging models and LLM agents on FHIR data pipelines, sells into the NHS and diagnostics. Their goal this quarter is a first NHS pilot and clarity on the regulatory path for AI as a medical device. They do not want academic-only grants.

The page offers you tools. Use them. Rules that matter:
- The founder is watching the screen. Every tool call changes what they see, so work in a sensible order and do not thrash.
- Move fast. You have at most six tool calls per turn. Do not try to read every item — filter well, read only what you will act on, and act.
- Never call search_items twice with the same filters, and never read an item you have already read.
- Read the workspace before you suggest again, so you never repeat something the founder turned down.
- Set aside only items you have actually judged against the profile, at most five per turn, each with a reason the founder would recognise. Never sweep the list.
- A shortlist is a ranking, not a verdict. When the founder's situation changes, re-rank and re-read what you suggested; keep what still helps, say plainly what no longer does, and never leave the shortlist empty if anything on the radar can still move them forward.
- When you suggest something, ground the angle in the item itself and give one concrete next step with the real date.
- Be brief between calls. One short line, at most twenty words, of what you are doing and why. No lists, no headings, no summaries at the end.`

/**
 * Four turns. The third is the point of the entry: the founder tells their agent
 * something the website will never see, and the page changes because of it.
 */
const TURNS = [
  { say: 'Set up my profile on this page from what you know about us.' },
  { say: "Go through the radar and shortlist the three or four things we should act on this month — why each fits us, and the one next step. Set aside what we can't apply for, with the reason." },
  { say: "One thing you don't know: we lost our NHS pilot partner last week, and we've got about six weeks of runway. We're a company, not a university. Does that change what you'd have me do? Change the shortlist on the page to match.", founderActs: true },
  { say: 'Read what I kept and dropped, then draft the brief.' },
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

  // The conversation, drawn on the page so the viewer sees both sides. The
  // strip is injected by this harness; it is not part of the product.
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.textContent = `
      #demo-chat { position: fixed; left: 0; right: 0; bottom: 0; z-index: 9999; display: grid; gap: 8px; padding: 14px 28px 18px; pointer-events: none;
        font: 500 19px/1.35 "Helvetica Neue", Arial, sans-serif; background: linear-gradient(to top, rgba(11,12,12,.92), rgba(11,12,12,.86) 70%, transparent); }
      #demo-chat p { margin: 0; max-width: 1180px; padding: 10px 16px; border-radius: 10px; color: #fff; opacity: 0; transform: translateY(8px); transition: opacity .35s, transform .35s; }
      #demo-chat p[data-on] { opacity: 1; transform: none; }
      #demo-chat p[data-who='founder'] { background: #1d70b8; justify-self: end; }
      #demo-chat p[data-who='agent'] { background: #2b2d2e; justify-self: start; border-left: 4px solid #00703c; }
      #demo-chat p b { opacity: .75; font-weight: 600; margin-right: .5em; }
      #demo-chat p em { font-style: normal; color: #ffdd00; }`
    document.head.appendChild(style)
    const box = document.createElement('div')
    box.id = 'demo-chat'
    document.body.appendChild(box)
    window.__caption = (who, text) => {
      const p = document.createElement('p')
      p.dataset.who = who
      p.innerHTML = `<b>${who === 'founder' ? 'You' : 'Your agent'}</b>${text}`
      box.appendChild(p)
      while (box.children.length > 2) box.firstChild.remove()
      requestAnimationFrame(() => (p.dataset.on = '1'))
    }
  })

  const anthropic = new Anthropic({ apiKey })
  const messages = []
  const transcript = []
  const escape = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
  const trim = (t) => (t.length > 170 ? t.slice(0, 167).replace(/\s+\S*$/, '') + '…' : t)
  const say = async (who, text) => {
    transcript.push({ who, text, at: Date.now() - startedAt })
    console.log(`[${who}] ${text}`)
    if (who === 'founder' || who === 'agent') {
      const shown = trim(text.replace(/\*\*/g, '').replace(/\s+/g, ' ').split(/\n/)[0])
      await page.evaluate(([w, t]) => window.__caption?.(w, t), [who, escape(shown)])
    }
  }

  for (const turn of TURNS) {
    await say('founder', turn.say)
    messages.push({ role: 'user', content: turn.say })
    await sleep(2200)

    for (let step = 0; step < 8; step++) {
      const res = await anthropic.messages.create({ model: MODEL, max_tokens: 1500, system: SYSTEM, tools: await currentTools(page, tools), messages })
      messages.push({ role: 'assistant', content: res.content })
      for (const block of res.content) if (block.type === 'text' && block.text.trim()) await say('agent', block.text.trim())
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
    if (turn.founderActs) {
      const acted = await page.evaluate(async () => {
        const rank = { weak: 0, possible: 1, strong: 2 }
        const cards = [...document.querySelectorAll('section[data-mark="suggested"]')]
        if (cards.length === 0) return null
        // Drop the weakest suggestion on screen, and say why.
        const card = cards.sort((a, b) => rank[a.querySelector('blockquote')?.dataset.fit ?? 'weak'] - rank[b.querySelector('blockquote')?.dataset.fit ?? 'weak'])[0]
        card.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await new Promise((r) => setTimeout(r, 1100))
        card.querySelector('button[value="drop"]')?.click()
        await new Promise((r) => setTimeout(r, 700))
        const input = card.querySelector('input[name="reason"]')
        if (input) {
          input.focus()
          for (const ch of 'we need money in weeks, not next year') {
            input.value += ch
            input.dispatchEvent(new Event('input', { bubbles: true }))
            await new Promise((r) => setTimeout(r, 55))
          }
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }
        // And keep the one that matters.
        const keep = [...document.querySelectorAll('section[data-mark="suggested"]')].find((c) => c.querySelector('blockquote[data-fit="strong"]'))
        if (keep) {
          await new Promise((r) => setTimeout(r, 700))
          keep.scrollIntoView({ behavior: 'smooth', block: 'center' })
          await new Promise((r) => setTimeout(r, 700))
          keep.querySelector('button[value="kept"]')?.click()
        }
        return card.querySelector('h2').textContent
      })
      if (acted) await say('founder-action', `dropped: ${acted}`)
      await sleep(1600)
    }
  }

  await sleep(5000)
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
