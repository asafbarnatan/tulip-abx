import { describe, it, expect } from 'vitest'
import {
  computeCampaignKpis,
  benchmarkCtr,
  benchmarkCpc,
  benchmarkCpl,
  benchmarkClickToLead,
  formatUsd,
  formatPct,
} from '@/lib/linkedin-kpis'

describe('computeCampaignKpis — Bayer-style ABM campaign', () => {
  const bayerLikeRaw = {
    impressions: 287,
    clicks: 9,
    leads: 2,
    cost_usd: 38.14,
    budget_usd: 44,
    status: 'active',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    audience_size: 440,
    unique_companies: 1,
    decision_maker_pct: 62,
  }

  it('computes CTR/CPC/CPM correctly for live Bayer-shape numbers', () => {
    const k = computeCampaignKpis(bayerLikeRaw, 1)
    expect(k.ctr).toBeCloseTo(3.1359, 3) // 9/287 * 100
    expect(k.cpc).toBeCloseTo(4.2378, 3) // 38.14/9
    expect(k.cpm).toBeCloseTo(132.89, 1) // 38.14/287 * 1000
  })

  it('computes CPL and click-to-lead rate', () => {
    const k = computeCampaignKpis(bayerLikeRaw, 1)
    expect(k.cpl).toBeCloseTo(19.07, 2) // 38.14/2
    expect(k.clickToLeadRate).toBeCloseTo(22.22, 1) // 2/9 * 100
  })

  it('budget burn % caps at 100', () => {
    const k = computeCampaignKpis({ ...bayerLikeRaw, cost_usd: 50 }, 1)
    expect(k.budgetBurnPct).toBe(100) // capped, not 113.6%
  })

  it('ABM account reach at 100% for 1-of-1 target', () => {
    const k = computeCampaignKpis(bayerLikeRaw, 1)
    expect(k.accountReachPct).toBe(100)
    expect(k.buyingCommitteeDepth).toBe(9) // 9 clicks / 1 account
  })

  it('returns null for metrics when denominator is zero', () => {
    const k = computeCampaignKpis(
      { ...bayerLikeRaw, impressions: 0, clicks: 0, leads: 0, cost_usd: 0 },
      1,
    )
    expect(k.cpc).toBeNull()
    expect(k.cpm).toBeNull()
    expect(k.cpl).toBeNull()
    expect(k.clickToLeadRate).toBeNull()
    expect(k.ctr).toBe(0)
  })

  it('daysLive starts at 1 minimum and caps at 30', () => {
    const fresh = computeCampaignKpis({ ...bayerLikeRaw, created_at: new Date().toISOString() }, 1)
    expect(fresh.daysLive).toBe(1)
    const old = computeCampaignKpis(
      { ...bayerLikeRaw, created_at: new Date(Date.now() - 90 * 86400_000).toISOString() },
      1,
    )
    expect(old.daysLive).toBe(30)
  })
})

describe('benchmark bands — LinkedIn B2B industry standards', () => {
  it('CTR bands: green ≥0.65, amber 0.35-0.65, red <0.35, neutral at 0', () => {
    expect(benchmarkCtr(0.7)).toBe('green')
    expect(benchmarkCtr(0.65)).toBe('green')
    expect(benchmarkCtr(0.5)).toBe('amber')
    expect(benchmarkCtr(0.2)).toBe('red')
    expect(benchmarkCtr(0)).toBe('neutral')
  })

  it('CPC bands: green ≤$5.50, amber ≤$10, red >$10, neutral for null', () => {
    expect(benchmarkCpc(5)).toBe('green')
    expect(benchmarkCpc(5.5)).toBe('green')
    expect(benchmarkCpc(8)).toBe('amber')
    expect(benchmarkCpc(12)).toBe('red')
    expect(benchmarkCpc(null)).toBe('neutral')
  })

  it('CPL bands for enterprise B2B targets', () => {
    expect(benchmarkCpl(100)).toBe('green')
    expect(benchmarkCpl(150)).toBe('green')
    expect(benchmarkCpl(200)).toBe('amber')
    expect(benchmarkCpl(400)).toBe('red')
    expect(benchmarkCpl(null)).toBe('neutral')
  })

  it('click-to-lead bands', () => {
    expect(benchmarkClickToLead(6)).toBe('green')
    expect(benchmarkClickToLead(3)).toBe('amber')
    expect(benchmarkClickToLead(1)).toBe('red')
    expect(benchmarkClickToLead(null)).toBe('neutral')
  })
})

describe('formatters', () => {
  it('formatUsd handles null / infinity', () => {
    expect(formatUsd(null)).toBe('—')
    expect(formatUsd(Infinity)).toBe('—')
    expect(formatUsd(38.14)).toBe('$38.14')
    expect(formatUsd(44, 0)).toBe('$44')
  })

  it('formatPct handles null', () => {
    expect(formatPct(null)).toBe('—')
    expect(formatPct(3.14)).toBe('3.14%')
  })
})
