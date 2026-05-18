# UK AI Radar — agent guide

> Inherits [`apps/poc/AGENTS.md`](../AGENTS.md). This POC is independent until promoted; do not wire to production infra.

## Mission

Surface, weekly, the parts of UK government activity that change what an AI founder should do next. Cite every claim. Never republish gov content beyond fair-use snippets.

## Sources — strict whitelist

Enforced at `server/utils/fetch.ts`. Any URL not matching the allowed host suffixes is rejected.

- `www.gov.uk`
- `www.ukri.org` (and the Innovate UK Funding Service subdomain when relevant)
- `developer.parliament.uk`, `hansard.parliament.uk`, `committees.parliament.uk`

Adding a source = updating the whitelist + adding a source adapter under `server/sources/`.

## Personas (LangGraph nodes)

Each persona is a pure async function `(state) => Promise<Partial<state>>` under `server/graph/personas/`.

- **Scout** — fetch all whitelisted feeds, compute content hashes, diff against the SQLite cache, forward only changed/new items.
- **Analyst** — extract structured fields (deadlines, money, eligibility, named bodies) using Anthropic tool-use bound to a Zod schema from `server/utils/schemas.ts`.
- **Strategist** — score each analysed item against the active founder profile. Write the per-item "so what?" angle.
- **Editor** — dedupe across personas, rank by `deadline × fit × actionability`, emit the brief.

Deferred to v2 (architecture supports plug-in without graph rewrite):

- **Lawyer** — flag contradictions with stated user policies / ToS.
- **Lobbyist** — surface consultations and committee inquiries with a drafted response skeleton.
- **Grant Writer** — produce an application skeleton in funder-mirrored language.
- **Archivist** — visualise diffs across runs of the same source.

## Multi-tenant story

The same cache and the same Scout/Analyst output feed multiple Strategist runs, one per profile. This is the demo of `TenantContext` isolation from `apps/orchestra/docs/whitepapers/2026-multi-tenant-agent-architecture.md` — retrieval is shared, ranking is per-tenant.

## Government collaboration posture

We want HMG bodies (DSIT, AISI, UKRI, i.AI, the Open Innovation Team) to see this as friendly and useful, not as impersonation. Therefore:

- **Banner on every page**: "Independent project. Not affiliated with HM Government."
- **Never use** the crown, the GOV.UK wordmark, or any `gov.uk` subdomain.
- **Cite, link, do not republish**.
- **Stay accurate** — one hallucinated grant deadline destroys credibility with the audience we most want.

Post-MVP introduction avenues are listed in the plan file. Order is: open publication → consultation responses → Open Innovation Team / RHC → Innovate UK Edge advisors → DSIT AI Directorate → i.AI co-build conversation.

## Non-goals (MVP)

- Auth, accounts, billing.
- Email / Slack delivery.
- Vector store or corpus-wide RAG.
- Promotion into `apps/orchestra` (separate decision).
- Coverage of think tanks, press, social media — the value is filtering these *out*.

## Conventions

- pnpm. TypeScript strict. Vitest.
- Semantic HTML; GOV.UK Design System tokens for visuals. No Tailwind, no CSS-in-JS.
- Personas are small and testable. If a persona file exceeds ~120 lines, split it.
- Every LLM call returns Zod-validated structured output. No string parsing of model responses.
