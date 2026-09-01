const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', pound: '£', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' }

function decodeOnce(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return NAMED[code.toLowerCase()] ?? m
  })
}

/** Feeds double-encode ("&amp;#038;"), so decode until the text stops changing. */
export function decodeEntities(s: string): string {
  let out = s
  for (let i = 0; i < 3; i++) {
    const next = decodeOnce(out)
    if (next === out) break
    out = next
  }
  return out
}
