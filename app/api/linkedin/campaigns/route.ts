import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { syncLinkedInAnalytics } from '@/lib/linkedin-analytics'

// GET /api/linkedin/campaigns               → all campaigns
// GET /api/linkedin/campaigns?accountId=X   → campaigns for one account only
// GET /api/linkedin/campaigns?sync=1        → force a LinkedIn analytics sync first
export async function GET(request: NextRequest) {
  const sb = getSupabase()
  const accountId = request.nextUrl.searchParams.get('accountId')
  const forceSync = request.nextUrl.searchParams.get('sync') === '1'

  // Select * — missing columns (pre-migration) should degrade to undefined, not fail.
  const { data: settingsRaw } = await sb.from('app_settings').select('*').single()
  const settings = settingsRaw as Record<string, unknown> | null

  const accessToken = settings?.linkedin_access_token as string | undefined
  const adsScopeOk = settings?.linkedin_ads_scope_ok === true

  // Sync analytics on demand (?sync=1) — quiet fallback when scope isn't available.
  let syncResult: Awaited<ReturnType<typeof syncLinkedInAnalytics>> | null = null
  if (forceSync && accessToken && adsScopeOk) {
    syncResult = await syncLinkedInAnalytics(accountId)
  }

  // Sort priority:
  //   1. pinned_at DESC NULLS LAST    — featured spotlight always wins
  //   2. display_order ASC NULLS LAST — manual drag order
  //   3. created_at DESC              — newest-first fallback
  // If either new column doesn't exist yet (migrations 2026-04-23_linkedin_campaign_*.sql
  // not applied), silently fall back to created_at-only ordering so the panel
  // keeps working; pin + drag features just no-op until the migrations land.
  let query = sb
    .from('linkedin_campaigns')
    .select('*, accounts(name)')
    .order('pinned_at', { ascending: false, nullsFirst: false })
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (accountId) query = query.eq('account_id', accountId)
  let { data: campaigns, error } = await query

  if (error && /pinned_at|display_order/.test(error.message)) {
    let fallback = sb.from('linkedin_campaigns').select('*, accounts(name)').order('created_at', { ascending: false })
    if (accountId) fallback = fallback.eq('account_id', accountId)
    const retry = await fallback
    campaigns = retry.data
    error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    campaigns: campaigns ?? [],
    connected: !!accessToken,
    identity: (settings?.linkedin_org_id as string | null | undefined) ?? null,
    ads_scope_ok: adsScopeOk,
    granted_scopes: (settings?.linkedin_granted_scopes as string | null | undefined) ?? null,
    last_sync_at: (settings?.linkedin_last_sync_at as string | null | undefined) ?? null,
    last_sync_error: (settings?.linkedin_last_sync_error as string | null | undefined) ?? null,
    sync_result: syncResult,
  })
}

// POST /api/linkedin/campaigns
// Creates a new campaign row as 'draft'. Used by the in-panel "New campaign" button.
// Agent-generated campaigns go through LinkedInOutreachAgent's save_linkedin_campaign tool
// and hit the same table — both paths produce the same row shape.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const {
    account_id,
    campaign_name,
    headline,
    ad_copy,
    objective,
    target_companies,
    budget_usd,
  } = body ?? {}

  if (!account_id || typeof account_id !== 'string') {
    return NextResponse.json({ error: 'account_id is required' }, { status: 400 })
  }
  if (!campaign_name || typeof campaign_name !== 'string' || !campaign_name.trim()) {
    return NextResponse.json({ error: 'campaign_name is required' }, { status: 400 })
  }

  const row = {
    account_id,
    campaign_name: campaign_name.trim().slice(0, 200),
    status: 'draft' as const,
    headline: typeof headline === 'string' && headline.trim() ? headline.trim().slice(0, 300) : null,
    ad_copy: typeof ad_copy === 'string' && ad_copy.trim() ? ad_copy.trim().slice(0, 2000) : null,
    objective: typeof objective === 'string' && objective.trim() ? objective.trim() : 'WEBSITE_VISITS',
    target_companies: Array.isArray(target_companies)
      ? target_companies.filter((t: unknown): t is string => typeof t === 'string' && !!t.trim()).map((t: string) => t.trim())
      : [],
    budget_usd: typeof budget_usd === 'number' && Number.isFinite(budget_usd) ? budget_usd : null,
    impressions: 0,
    clicks: 0,
    leads: 0,
    cost_usd: 0,
  }

  const { data, error } = await getSupabase()
    .from('linkedin_campaigns')
    .insert(row)
    .select('*, accounts(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: data })
}
