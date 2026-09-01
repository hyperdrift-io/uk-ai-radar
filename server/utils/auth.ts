import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Generating a brief runs the radar's models — real cost, real minutes. Anyone
 * may read; only a holder of RADAR_ADMIN_TOKEN may write profiles or trigger a run.
 * With no token configured, the write endpoints stay closed rather than open.
 */
export function requireAdmin(event: H3Event): void {
  const expected = process.env.RADAR_ADMIN_TOKEN
  if (!expected) {
    throw createError({ statusCode: 503, statusMessage: 'brief generation is switched off on this deployment' })
  }
  const given = getHeader(event, 'x-radar-token') ?? ''
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw createError({ statusCode: 401, statusMessage: 'access code needed to generate a brief' })
  }
}
