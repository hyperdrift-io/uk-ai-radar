# Profiles

Each `*.json` file is a founder profile consumed by the Strategist persona to rank brief items.

## Schema

```ts
{
  slug: string          // URL-safe identifier, used as /brief/[slug]
  company: string
  stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'later'
  geo: string           // headquartered region (UK eligibility matters for grants)
  sectors: string[]     // domain tags
  stack: string[]       // technical tags
  goals: string[]       // free-text near-term objectives
  exclude: string[]     // free-text disqualifiers
}
```

## Conventions

- `example.json` is tracked in git as a reference. All other profiles are gitignored.
- The `slug` must match the file basename: `acme.json` → `slug: "acme"`.
- Keep `goals` and `exclude` to short imperative phrases — they end up in the LLM prompt verbatim.
