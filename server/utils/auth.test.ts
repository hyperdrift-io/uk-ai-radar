import { afterEach, describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import { requireAdmin } from './auth'

// h3's createError/getHeader are Nuxt auto-imports on the server; provide them here.
;(globalThis as any).createError = (e: { statusCode: number; statusMessage: string }) => Object.assign(new Error(e.statusMessage), e)
;(globalThis as any).getHeader = (event: H3Event, name: string) => (event as any).headers[name]

const event = (token?: string) => ({ headers: token === undefined ? {} : { 'x-radar-token': token } }) as unknown as H3Event
const original = process.env.RADAR_ADMIN_TOKEN

afterEach(() => {
  if (original === undefined) delete process.env.RADAR_ADMIN_TOKEN
  else process.env.RADAR_ADMIN_TOKEN = original
})

describe('requireAdmin', () => {
  it('stays closed when no token is configured', () => {
    delete process.env.RADAR_ADMIN_TOKEN
    expect(() => requireAdmin(event('anything'))).toThrow(expect.objectContaining({ statusCode: 503 }))
  })
  it('rejects a missing, short or wrong token', () => {
    process.env.RADAR_ADMIN_TOKEN = 'correct-horse'
    expect(() => requireAdmin(event())).toThrow(expect.objectContaining({ statusCode: 401 }))
    expect(() => requireAdmin(event('corr'))).toThrow(expect.objectContaining({ statusCode: 401 }))
    expect(() => requireAdmin(event('correct-house'))).toThrow(expect.objectContaining({ statusCode: 401 }))
  })
  it('passes the exact token', () => {
    process.env.RADAR_ADMIN_TOKEN = 'correct-horse'
    expect(() => requireAdmin(event('correct-horse'))).not.toThrow()
  })
})
