# Profiles

Each `*.json` file is a founder profile consumed by the Strategist persona to rank brief items.

## Schema

```ts
{
  slug: string          // URL-safe identifier, used as /brief/[slug]
  company: string
  stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'later'
  geo: string           // headquartered region (UK eligibility matters for grants)
  sectors: string[]     // domain tags (e.g. "construction", "healthcare")
  capabilities: string[] // what the company does technically (e.g. "computer vision")
  trlBand?: 'research' | 'prototype' | 'deployment'
                       // maturity band — maps internally to TRL:
                       //   research   = TRL 1–3 (basic R&D, UKRI / ARIA)
                       //   prototype  = TRL 4–6 (Innovate UK Smart Grant sweet spot)
                       //   deployment = TRL 7–9 (contracts not grants)
  goals: string[]       // free-text near-term objectives
  exclude: string[]     // free-text disqualifiers
}
```

## Conventions

- `example.json` is tracked in git as a reference. All other profiles are gitignored.
- The `slug` must match the file basename: `acme.json` → `slug: "acme"`.
- Keep `goals` and `exclude` to short imperative phrases — they end up in the LLM prompt verbatim.
