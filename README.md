# UK AI Radar

> Orchestra POC. An agentic radar over UK government surface area (gov.uk, UKRI, Parliament) that produces a personalised weekly action brief for an AI founder profile.

Independent project. Not affiliated with HM Government.

**Bring your agent.** Open [radar.hyperdrift.io/explore](https://radar.hyperdrift.io/explore)
in a browser with an agent (ChatGPT's built-in browser, or Chrome with WebMCP enabled)
and the agent works the page with you: it reads every item, proposes your profile,
suggests what fits and why, and drafts the brief — you keep the final call on each.
How it is built: [WEBMCP.md](./WEBMCP.md).

## Why

UK AI founders need to track government direction (grants, tenders, consultations, policy shifts) but have no single feed personalised to their profile. The newsletter ecosystem is generic; gov.uk is exhaustive but undirected.

This POC demonstrates Orchestra's positioning on a real, high-signal vertical: a multi-persona agent pipeline that ingests authoritative sources, ranks by founder profile, and produces a brief with every claim cited.

## Stack

- Nuxt 3 (SSR) + Vue 3 + TypeScript
- GOV.UK Design System (`govuk-frontend`) — visual language only; no crown / wordmark
- LangGraph.js + Anthropic SDK
- SQLite for the page-hash cache (diff-first retrieval)
- Vitest

## Quick start

```bash
cd apps/poc/uk-ai-radar
cp .env.example .env                          # add ANTHROPIC_API_KEY
cp profiles/example.json profiles/acme.json   # edit for your profile
pnpm install
pnpm digest --profile profiles/acme.json      # generate brief (writes to digests/)
pnpm dev                                      # view at http://localhost:3000
```

Visit `/brief/acme` to see the brief, `/sources` for tracked surfaces, `/about` for methodology.

## Sources (strict whitelist)

| Host | Purpose | Access |
|---|---|---|
| `www.gov.uk` | Department announcements, consultations, policy papers | Search API + RSS |
| `www.ukri.org` / Innovate UK Funding Service | Open grants and calls | Listing pages + RSS |
| `developer.parliament.uk` | Hansard, committees, written questions | Official Parliament APIs |

Any host outside this whitelist is rejected at the fetcher.

## Personas

| Persona | Role |
|---|---|
| Scout | Fetch, hash, diff, forward only deltas |
| Analyst | Extract structured fields (Zod schemas via Anthropic tool-use) |
| Strategist | Score against founder profile, write the "so what?" angle |
| Editor | Dedupe, rank, emit brief |

Deferred to v2: Lawyer, Lobbyist, Grant Writer, Archivist. The graph is designed to accept them without rewrite.

## Multi-tenant demo

Profiles are JSON files under `profiles/`. The same cache produces different briefs depending on the profile. Run with two profiles to demonstrate:

```bash
pnpm digest --profile profiles/acme.json
pnpm digest --profile profiles/beta.json
```

Maps to the `TenantContext` pattern in `apps/orchestra/docs/whitepapers/2026-multi-tenant-agent-architecture.md`.

## Verification

```bash
pnpm test                                        # vitest unit tests
pnpm digest --profile profiles/example.json      # first run: full fetch
pnpm digest --profile profiles/example.json      # second run: cache hits (<20% tokens)
```

Acceptance:

- 100% of cited URLs in any brief resolve to `gov.uk`, `ukri.org`, or `parliament.uk`.
- Second consecutive run consumes <20% of first-run tokens.
- Two profiles on same cache produce visibly different top-3.

## Non-affiliation

This site uses the GOV.UK Design System's components and typographic tokens because they are excellent and accessible. It does not use the crown, the GOV.UK wordmark, or any gov.uk subdomain, and does not claim any affiliation with HM Government. A banner on every page makes this explicit.

If a UK government body wants to discuss a co-branded variant, see Orchestra's contact form.
