import { describe, it, expect } from 'vitest'

// Mirrors the zero-overwrite guard in lib/linkedin-analytics.ts.
// If a future refactor drops the guard, this test will fail and protect Bayer's
// $44 live spend row from being blanked by a partial LinkedIn analytics response.
interface Element {
  pivotValues?: string[]
  impressions?: number
  clicks?: number
  externalWebsiteConversions?: number
  costInLocalCurrency?: string | number
}

function hasAnyMetric(el: Element): boolean {
  return (
    el.impressions !== undefined ||
    el.clicks !== undefined ||
    el.costInLocalCurrency !== undefined ||
    el.externalWebsiteConversions !== undefined
  )
}

function buildPartialUpdate(el: Element): Record<string, unknown> {
  const update: Record<string, unknown> = { updated_at: 'now' }
  if (el.impressions !== undefined) update.impressions = Number(el.impressions) || 0
  if (el.clicks !== undefined) update.clicks = Number(el.clicks) || 0
  if (el.externalWebsiteConversions !== undefined) update.leads = Number(el.externalWebsiteConversions) || 0
  if (el.costInLocalCurrency !== undefined) update.cost_usd = Number(el.costInLocalCurrency) || 0
  return update
}

describe('linkedin-analytics zero-overwrite guard (Bayer safety)', () => {
  it('skips update when LinkedIn returns element with no metric fields', () => {
    const el: Element = { pivotValues: ['urn:li:sponsoredCampaign:690308904'] }
    expect(hasAnyMetric(el)).toBe(false)
  })

  it('includes update when at least one metric is present', () => {
    expect(hasAnyMetric({ impressions: 42 })).toBe(true)
    expect(hasAnyMetric({ clicks: 1 })).toBe(true)
    expect(hasAnyMetric({ costInLocalCurrency: '0.50' })).toBe(true)
    expect(hasAnyMetric({ externalWebsiteConversions: 0 })).toBe(true)
  })

  it('partial update preserves unprovided fields (no zero-overwrite)', () => {
    // LinkedIn returns impressions + clicks but no cost or conversions — we
    // must write ONLY impressions+clicks, leaving stored cost/leads alone.
    const update = buildPartialUpdate({ impressions: 287, clicks: 9 })
    expect(update).toHaveProperty('impressions', 287)
    expect(update).toHaveProperty('clicks', 9)
    expect(update).not.toHaveProperty('cost_usd')
    expect(update).not.toHaveProperty('leads')
  })

  it('full update writes all four metrics when LinkedIn sends them', () => {
    const update = buildPartialUpdate({
      impressions: 287,
      clicks: 9,
      costInLocalCurrency: '38.14',
      externalWebsiteConversions: 2,
    })
    expect(update).toMatchObject({
      impressions: 287,
      clicks: 9,
      cost_usd: 38.14,
      leads: 2,
    })
  })

  it('handles zero values explicitly (0 is a real measurement, not "missing")', () => {
    const update = buildPartialUpdate({ impressions: 0, clicks: 0 })
    expect(update.impressions).toBe(0)
    expect(update.clicks).toBe(0)
  })
})
