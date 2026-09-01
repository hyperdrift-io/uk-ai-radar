# WebMCP in UK AI Radar

UK AI Radar reads gov.uk, UKRI and Parliament and turns what changed into
grants, tenders, consultations, policy and guidance an AI founder can act on.
This document says what existed before the WebMCP Challenge window opened
(25 August 2026) and what was added inside it, for the judges and for anyone
reading the code.

## Before 25 August 2026

Built May 2026 as an Orchestra proof of concept (see the git history up to
`2026-05-18`):

- The Scout → Analyst → Strategist → Editor pipeline (`server/graph/`) that
  fetches whitelisted government sources, extracts structured records with an
  LLM, and writes a weekly brief per founder profile (`bin/digest.ts`).
- The SQLite cache of analysed items and the `/api/search` endpoint.
- The Nuxt pages: home, brief, sources, about, new profile, and an Explore page
  that was a read-only search form over the cache.

## Added during the window (1–3 September 2026)

Everything below is new and is the entry. Commits are dated; see `git log --since=2026-09-01`.

**The Explore page became a shared workspace.** A founder and the agent in
their browser act on the same elements: the founder profile, the filters, a
shortlist, items set aside, and a brief. The page registers its own actions
with `document.modelContext` so the agent works the page rather than
replacing it.

| Tool | What it does on the page |
|---|---|
| `search_items` | Applies the filters the founder sees (keyword, kind, source, deadline) and returns the matches. |
| `read_item` | Returns one item in full, including what the founder and the agent have already noted on it. |
| `propose_founder_profile` | Fills the profile form from what the agent knows about the founder. The form is highlighted as *proposed* until the founder keeps it. |
| `suggest_item` | Puts an item on the shortlist as the agent's suggestion, with a fit level, the angle and the next step. The founder keeps or drops it with one click. |
| `set_aside_items` | Moves one or many items out of the list with one reason. The founder can restore any of them. |
| `read_workspace` | Returns the shared state: profile and whether it was confirmed, filters, shortlist with the founder's decisions and notes, what was set aside, the brief. |
| `draft_brief` | Registered only while the shortlist has items (the page fires `toolchange`). Writes the shortlist up as a markdown brief and shows it. |

Files:

- `plugins/webmcp.client.ts` — tool registration; every `execute` calls the same
  functions the buttons call.
- `composables/useWorkspace.ts` — the reactive workspace both sides share,
  persisted per browser.
- `utils/workspace.ts` (+ tests) — pure logic: filtering with the same
  semantics as the server search, marks, the brief renderer.
- `components/FounderProfileCard.vue`, `components/Shortlist.vue`,
  `components/ItemCard.vue`, `pages/explore.vue` — the workspace UI. State is
  carried by attributes (`data-status`, `data-mark`, `data-kind`, `data-fit`)
  and styled in `assets/styles/main.scss`.
- `types/webmcp.d.ts` — local typing of the WebMCP imperative API.

Also in the window: the MIT licence, a fix to the search SQL quoting, and the
first full data runs since May (100 items, then 66 after dropping off-topic feeds and stale entries).

## Why WebMCP and not a backend MCP server

The radar's value is judgement: which of the government items matters
to *this* founder. Before, that judgement ran as a batch pipeline on our
server, once a week, with a founder profile we had to hold. With WebMCP the
judgement runs in the founder's own agent, on the page they are looking at,
with context the page never sees (what they told their agent about their
company, their pipeline, their week). The site keeps the data and the UI; the
founder keeps their context; the agent reads every item and the
founder decides. That split was not possible with a server-side integration.

## Trying it

- ChatGPT desktop app: open `https://radar.hyperdrift.io/explore` in the
  built-in browser and ask for help. Site tools appear in the address bar.
- Chrome 149+: enable `chrome://flags/#enable-webmcp-testing`, relaunch, open
  the same URL. `document.modelContext.getTools()` in DevTools lists the tools;
  the Model Context Tool Inspector extension lets you call them.
