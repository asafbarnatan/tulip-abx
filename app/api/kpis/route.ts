import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// The 5 Claude Opus 4.6 agents the platform ships with. Used for the "Active agents"
// tile. If we ever add a 6th agent (e.g. ContactResearchAgent joining the pipeline),
// bump this list — it drives the tile value without requiring a schema change.
const ACTIVE_AGENTS = [
  'AccountIntelligenceAgent',
  'PositioningAgent',
  'PlayOrchestratorAgent',
  'SignalWatcherAgent',
  'LinkedInOutreachAgent',
]

export async function GET() {
  const sb = getSupabase()

  const [
    { data: accounts },
    { data: signals },
    { data: briefs },
    { data: actions },
    { data: campaigns },
  ] = await Promise.all([
    sb.from('accounts').select('id, tier, lifecycle_stage, icp_fit_score, engagement_score'),
    sb.from('signals').select('id, processed'),
    sb.from('positioning_briefs').select('id, account_id, approved'),
    sb.from('account_actions').select('id, action_type, outcome, performed_by, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    sb.from('linkedin_campaigns').select('id, impressions, clicks, cost_usd, leads, total_engagements, status'),
  ])

  const allAccounts = accounts ?? []
  const tier1 = allAccounts.filter(a => a.tier === 1)
  const pipelineT1 = tier1.filter(a => a.lifecycle_stage === 'pipeline' || a.lifecycle_stage === 'customer')
  const pipelineCoverage = tier1.length > 0 ? Math.round((pipelineT1.length / tier1.length) * 100) : 0

  const tier12 = allAccounts.filter(a => a.tier === 1 || a.tier === 2)
  const avgIcp = tier12.length > 0
    ? Math.round(tier12.reduce((s, a) => s + (a.icp_fit_score ?? 0), 0) / tier12.length)
    : 0

  const allSignals = signals ?? []
  const signalBacklog = allSignals.filter(s => !s.processed).length

  const allActions = actions ?? []
  const PLAY_TYPES = ['demo', 'meeting', 'proposal', 'email', 'call']
  const allPlays = allActions.filter(a => PLAY_TYPES.includes(a.action_type ?? ''))
  // Executed plays = outcome stamped to something real (completed, stage_advanced,
  // declined, replied). Pending = still a draft waiting for a human to act.
  const executedPlays = allPlays.filter(a => a.outcome && a.outcome !== 'pending')
  const playsRecommended = tier1.length > 0 ? +(allPlays.length / tier1.length).toFixed(1) : 0
  const playsExecuted = tier1.length > 0 ? +(executedPlays.length / tier1.length).toFixed(1) : 0

  const allBriefs = briefs ?? []
  const briefsByAccount: Record<string, boolean> = {}
  for (const b of allBriefs) {
    if (b.account_id) {
      if (!briefsByAccount[b.account_id]) briefsByAccount[b.account_id] = false
      if (b.approved) briefsByAccount[b.account_id] = true
    }
  }
  const briefAccounts = Object.keys(briefsByAccount)
  const briefApproval = briefAccounts.length > 0
    ? Math.round((Object.values(briefsByAccount).filter(Boolean).length / briefAccounts.length) * 100)
    : 0

  const stageAdvanced = allActions.filter(a => a.outcome === 'stage_advanced').length

  const allCampaigns = campaigns ?? []
  const totalImpressions = allCampaigns.reduce((s, c) => s + (c.impressions ?? 0), 0)
  const totalClicks = allCampaigns.reduce((s, c) => s + (c.clicks ?? 0), 0)
  const totalLeads = allCampaigns.reduce((s, c) => s + (c.leads ?? 0), 0)
  const totalSpend = +allCampaigns.reduce((s, c) => s + Number(c.cost_usd ?? 0), 0).toFixed(2)
  // Engagement metrics — total_engagements column was added in the
  // 2026-04-24_campaign_engagements migration. Falls back to 0 for rows
  // that predate the migration or don't have CSV-imported engagement data.
  const totalEngagements = allCampaigns.reduce((s, c) => s + Number(c.total_engagements ?? 0), 0)
  const engagementRate = totalImpressions > 0 ? +((totalEngagements / totalImpressions) * 100).toFixed(2) : 0
  const linkedinCtr = totalImpressions > 0 ? +((totalClicks / totalImpressions) * 100).toFixed(2) : 0
  const activeCampaigns = allCampaigns.filter(c => c.status === 'active').length

  return NextResponse.json({
    // System
    active_agents: ACTIVE_AGENTS.length,
    total_accounts: allAccounts.length,
    tier1_count: tier1.length,
    active_campaigns: activeCampaigns,
    // Pipeline health
    pipeline_coverage: pipelineCoverage,
    avg_icp_score: avgIcp,
    signal_backlog: signalBacklog,
    account_velocity: stageAdvanced,
    // Strategy + Execution
    brief_approval: briefApproval,
    plays_recommended: playsRecommended,
    plays_executed: playsExecuted,
    // LinkedIn aggregates
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    total_leads: totalLeads,
    total_spend: totalSpend,
    linkedin_ctr: linkedinCtr,
    total_engagements: totalEngagements,
    engagement_rate: engagementRate,
  })
}
