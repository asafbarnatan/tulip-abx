import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// Returns the last 7 days of KPI snapshots for sparkline rendering.
// Each sparkline metric is returned as an ordered array from oldest to newest.
export async function GET() {
  const { data, error } = await getSupabase()
    .from('kpi_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: true })
    .limit(14)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const snapshots = data ?? []

  return NextResponse.json({
    dates: snapshots.map(s => s.snapshot_date),
    pipeline_coverage: snapshots.map(s => {
      const tier1 = s.tier1_accounts ?? 0
      const pipeline = s.pipeline_accounts ?? 0
      return tier1 > 0 ? Math.round((pipeline / tier1) * 100) : 0
    }),
    avg_icp_score: snapshots.map(s => Number(s.avg_icp_score) || 0),
    signal_backlog: snapshots.map(s => s.signals_unprocessed ?? 0),
    play_activation: snapshots.map(s => {
      const tier1 = s.tier1_accounts ?? 0
      return tier1 > 0 ? +(Number(s.plays_activated) / tier1).toFixed(1) : 0
    }),
    brief_approval: snapshots.map(s => {
      const total = s.briefs_total ?? 0
      const approved = s.briefs_approved ?? 0
      return total > 0 ? Math.round((approved / total) * 100) : 0
    }),
    account_velocity: snapshots.map(() => 0),
    linkedin_ctr: snapshots.map(s => {
      const imp = s.linkedin_impressions_total ?? 0
      const clk = s.linkedin_clicks_total ?? 0
      return imp > 0 ? +((clk / imp) * 100).toFixed(2) : 0
    }),
  })
}
