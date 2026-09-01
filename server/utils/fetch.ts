const ALLOWED_HOST_SUFFIXES = [
  'www.gov.uk',
  'www.ukri.org',
  'apply-for-innovation-funding.service.gov.uk',
  'developer.parliament.uk',
  'hansard.parliament.uk',
  'committees.parliament.uk',
  'committees-api.parliament.uk',
  'hansard-api.parliament.uk',
] as const

export type AllowedHost = (typeof ALLOWED_HOST_SUFFIXES)[number]

export class DisallowedHostError extends Error {
  constructor(public readonly host: string) {
    super(`host not in whitelist: ${host}`)
    this.name = 'DisallowedHostError'
  }
}

export function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return ALLOWED_HOST_SUFFIXES.some((h) => u.hostname === h)
  } catch {
    return false
  }
}

function userAgent(): string {
  const contact = process.env.RADAR_CONTACT_EMAIL ?? 'orchestra@hyperdrift.io'
  return `uk-ai-radar/0.1 (+https://ai.hyperdrift.io; contact: ${contact})`
}

export interface FetchOptions {
  accept?: string
  timeoutMs?: number
  retries?: number
}

/**
 * Polite, whitelisted fetcher.
 * - Rejects any URL whose host is not in the whitelist.
 * - Sends a descriptive User-Agent so server logs can identify us.
 * - Retries on transient 5xx / network errors with exponential backoff.
 */
export async function politeFetch(url: string, opts: FetchOptions = {}): Promise<string> {
  if (!isAllowedUrl(url)) {
    const host = (() => {
      try {
        return new URL(url).hostname
      } catch {
        return url
      }
    })()
    throw new DisallowedHostError(host)
  }

  const timeoutMs = opts.timeoutMs ?? 15_000
  const MAX_BODY_CHARS = 2_000_000
  const maxAttempts = (opts.retries ?? 2) + 1

  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': userAgent(),
          Accept: opts.accept ?? 'application/json, application/atom+xml, application/xml, text/html;q=0.9',
        },
        signal: controller.signal,
        // A whitelisted host must not be able to send us elsewhere.
        redirect: 'manual',
      })
      clearTimeout(t)
      if (res.status >= 300 && res.status < 400) {
        throw new Error(`fetch ${url} → ${res.status} redirect refused`)
      }
      if (res.status >= 500 && attempt < maxAttempts) {
        await sleep(2 ** attempt * 250)
        continue
      }
      if (!res.ok) {
        throw new Error(`fetch ${url} → ${res.status}`)
      }
      const text = await res.text()
      if (text.length > MAX_BODY_CHARS) {
        throw new Error(`fetch ${url} → body over ${MAX_BODY_CHARS} chars`)
      }
      return text
    } catch (err) {
      clearTimeout(t)
      lastErr = err
      if (attempt < maxAttempts) {
        await sleep(2 ** attempt * 250)
        continue
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`fetch failed: ${url}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Exposed for tests.
export const _ALLOWED_HOST_SUFFIXES = ALLOWED_HOST_SUFFIXES
