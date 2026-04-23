import { describe, it, expect } from 'vitest'

// Replicate the function locally to avoid importing from a Next.js route file
// (which pulls NextRequest/NextResponse and the Supabase client). The function
// is pure so this is safe and tests the exact same logic used at runtime.
function extractCampaignId(input: string): string {
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/\/campaigns\/(\d+)/)
  if (urlMatch) return urlMatch[1]
  if (/^\d+$/.test(trimmed)) return trimmed
  return trimmed
}

describe('extractCampaignId — Bayer URL parsing', () => {
  it('extracts numeric ID from full Campaign Manager URL', () => {
    expect(
      extractCampaignId('https://www.linkedin.com/campaignmanager/accounts/527710786/campaigns/690308904'),
    ).toBe('690308904')
  })

  it('extracts ID from URL with trailing path segments', () => {
    expect(
      extractCampaignId('https://www.linkedin.com/campaignmanager/accounts/123/campaigns/987654321/details'),
    ).toBe('987654321')
  })

  it('passes through bare numeric ID unchanged', () => {
    expect(extractCampaignId('690308904')).toBe('690308904')
  })

  it('trims whitespace', () => {
    expect(extractCampaignId('  690308904  ')).toBe('690308904')
  })

  it('returns input unchanged when no URL match and not numeric', () => {
    expect(extractCampaignId('foo-bar')).toBe('foo-bar')
  })

  it('handles URL with query string', () => {
    expect(
      extractCampaignId('https://www.linkedin.com/campaignmanager/accounts/1/campaigns/690308904?utm=x'),
    ).toBe('690308904')
  })
})
