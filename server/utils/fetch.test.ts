import { describe, expect, it } from 'vitest'
import { DisallowedHostError, isAllowedUrl, politeFetch } from './fetch'

describe('isAllowedUrl', () => {
  it.each([
    'https://www.gov.uk/government/news/xyz',
    'https://www.ukri.org/opportunity/abc',
    'https://developer.parliament.uk/',
    'https://hansard.parliament.uk/Commons',
    'https://committees.parliament.uk/inquiry/123',
    'https://apply-for-innovation-funding.service.gov.uk/competition/xyz',
    'https://committees-api.parliament.uk/api/Inquiries',
    'https://hansard-api.parliament.uk/search.json',
  ])('allows whitelisted host %s', (url) => {
    expect(isAllowedUrl(url)).toBe(true)
  })

  it.each([
    'https://gov.uk/news',
    'https://example.com',
    'https://news.gov.uk/x',
    'https://www-gov-uk.example.com',
    'not a url',
  ])('rejects non-whitelisted %s', (url) => {
    expect(isAllowedUrl(url)).toBe(false)
  })
})

describe('politeFetch', () => {
  it('throws DisallowedHostError before hitting the network', async () => {
    await expect(politeFetch('https://example.com/x')).rejects.toBeInstanceOf(DisallowedHostError)
  })
})
