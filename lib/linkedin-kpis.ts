// Classic SaaS B2B marketing KPIs for LinkedIn Sponsored Content ABM campaigns.
// These are the metrics a real B2B demand-gen team would track in dashboards and QBRs.

export interface CampaignRawMetrics {
  impressions: number
  clicks: number
  leads: number
  cost_usd: number
  budget_usd?: number | null
  status: string
  created_at: string
  // Optional ABM fields — only populated once LinkedIn Marketing API is wired.
  // Until then derived/estimated from demographics we already know (audience size, seniority mix).
  audience_size?: number | null
  unique_companies?: number | null
  decision_maker_pct?: number | null
}

export interface CampaignKpis {
  // Spend + pacing
  spend: number
  budgetBurnPct: number | null    // spend / budget_usd × 100
  daysLive: number                // days since campaign started (max 30)
  // Volume
  impressions: number
  clicks: number
  leads: number
  // Efficiency
  ctr: number                     // clicks / impressions × 100 (%)
  cpc: number | null              // spend / clicks
  cpm: number | null              // spend / impressions × 1000
  cpl: number | null              // spend / leads (cost per lead)
  // Conversion funnel
  clickToLeadRate: number | null  // leads / clicks × 100 (%)
  // ABM-specific (derived where possible)
  accountReachPct: number | null  // unique_companies / target_accounts × 100 (we only target 1 acct in ABM, so capped at 100)
  buyingCommitteeDepth: number | null  // clicks / target_accounts (proxy for buying committee coverage)
  qualifiedImpressionShare: number | null // impressions × decision_maker_pct (estimated share of impressions hitting VP+)
}

export function computeCampaignKpis(
  m: CampaignRawMetrics,
  targetAccountCount = 1, // ABM default: one named account
): CampaignKpis {
  const spend = m.cost_usd ?? 0
  const impressions = m.impressions ?? 0
  const clicks = m.clicks ?? 0
  const leads = m.leads ?? 0

  const createdMs = new Date(m.created_at).getTime()
  const daysLive = Math.max(1, Math.min(30, Math.floor((Date.now() - createdMs) / (24 * 60 * 60 * 1000))))

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc = clicks > 0 ? spend / clicks : null
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : null
  const cpl = leads > 0 ? spend / leads : null
  const clickToLeadRate = clicks > 0 ? (leads / clicks) * 100 : null

  const budgetBurnPct = m.budget_usd && m.budget_usd > 0
    ? Math.min(100, (spend / m.budget_usd) * 100)
    : null

  const accountReachPct = m.unique_companies != null && targetAccountCount > 0
    ? Math.min(100, (m.unique_companies / targetAccountCount) * 100)
    : null

  const buyingCommitteeDepth = targetAccountCount > 0 ? clicks / targetAccountCount : null

  const qualifiedImpressionShare = m.decision_maker_pct != null
    ? impressions * (m.decision_maker_pct / 100)
    : null

  return {
    spend,
    budgetBurnPct,
    daysLive,
    impressions,
    clicks,
    leads,
    ctr,
    cpc,
    cpm,
    cpl,
    clickToLeadRate,
    accountReachPct,
    buyingCommitteeDepth,
    qualifiedImpressionShare,
  }
}

// Benchmark thresholds — LinkedIn B2B sponsored content industry benchmarks (2024-2026).
// Green = top quartile, Amber = median, Red = bottom quartile.
// Sources: LinkedIn Marketing Solutions Benchmark Report, Wordstream LinkedIn 2024 benchmarks.
export type BenchmarkBand = 'green' | 'amber' | 'red' | 'neutral'

export function benchmarkCtr(ctr: number): BenchmarkBand {
  if (ctr >= 0.65) return 'green'
  if (ctr >= 0.35) return 'amber'
  if (ctr > 0) return 'red'
  return 'neutral'
}

export function benchmarkCpc(cpc: number | null): BenchmarkBand {
  if (cpc == null) return 'neutral'
  // B2B LinkedIn CPC ranges $2-15. Pharma/finance premium targeting sits $8-15.
  if (cpc <= 5.5) return 'green'
  if (cpc <= 10) return 'amber'
  return 'red'
}

export function benchmarkCpl(cpl: number | null): BenchmarkBand {
  if (cpl == null) return 'neutral'
  // B2B SaaS target CPL on LinkedIn: $50-150 (enterprise), $150-300 (high-ACV).
  if (cpl <= 150) return 'green'
  if (cpl <= 300) return 'amber'
  return 'red'
}

export function benchmarkClickToLead(rate: number | null): BenchmarkBand {
  if (rate == null) return 'neutral'
  if (rate >= 5) return 'green'
  if (rate >= 2) return 'amber'
  return 'red'
}

export function formatUsd(v: number | null, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `$${v.toFixed(digits)}`
}

export function formatPct(v: number | null, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toFixed(digits)}%`
}
