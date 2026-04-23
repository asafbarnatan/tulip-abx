import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST() {
  const sb = getSupabase()

  const kpisRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/kpis`)
  const kpis = await kpisRes.json()

  const { data, error } = await sb.from('kpi_snapshots').insert({
    total_accounts: kpis.total_accounts,
    tier1_accounts: kpis.tier1_count,
    pipeline_accounts: null,
    avg_icp_score: kpis.avg_icp_score,
    avg_engagement_score: null,
    briefs_approved: null,
    briefs_total: null,
    plays_activated: kpis.play_activation,
    signals_unprocessed: kpis.signal_backlog,
    agent_runs_today: null,
    linkedin_impressions_total: kpis.total_impressions,
    linkedin_clicks_total: kpis.total_clicks,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ snapshot: data })
}
