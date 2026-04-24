import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// Extract LinkedIn campaign ID from a Campaign Manager URL
// Examples:
//   https://www.linkedin.com/campaignmanager/accounts/123456789/campaigns/987654321
//   https://www.linkedin.com/campaignmanager/accounts/123456789/campaigns/987654321/details
function extractCampaignId(input: string): string {
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/\/campaigns\/(\d+)/)
  if (urlMatch) return urlMatch[1]
  if (/^\d+$/.test(trimmed)) return trimmed
  return trimmed
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const sb = getSupabase()

  // Pin-to-top is mutually exclusive across all rows — pinning one clears every
  // other row's pinned_at first, so the "newest pinned wins" ordering invariant
  // holds without requiring a uniqueness constraint on the column.
  if (body.pinned === true) {
    await sb.from('linkedin_campaigns').update({ pinned_at: null }).neq('id', id)
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.pinned === true) update.pinned_at = new Date().toISOString()
  else if (body.pinned === false) update.pinned_at = null

  if (body.linkedin_campaign_id !== undefined) {
    // Empty string clears the link (sends campaign back to draft-like state in UI).
    update.linkedin_campaign_id = body.linkedin_campaign_id === ''
      ? null
      : extractCampaignId(body.linkedin_campaign_id)
  }
  if (body.status !== undefined) update.status = body.status
  if (body.impressions !== undefined) update.impressions = Number(body.impressions) || 0
  if (body.clicks !== undefined) update.clicks = Number(body.clicks) || 0
  if (body.leads !== undefined) update.leads = Number(body.leads) || 0
  if (body.total_engagements !== undefined) update.total_engagements = Math.max(0, Number(body.total_engagements) || 0)
  if (body.cost_usd !== undefined) update.cost_usd = Number(body.cost_usd) || 0
  if (body.budget_usd !== undefined) update.budget_usd = Number(body.budget_usd) || 0
  if (body.audience_size !== undefined) update.audience_size = body.audience_size === null || body.audience_size === '' ? null : Number(body.audience_size) || 0
  if (body.unique_companies !== undefined) update.unique_companies = body.unique_companies === null || body.unique_companies === '' ? null : Number(body.unique_companies) || 0
  if (body.decision_maker_pct !== undefined) update.decision_maker_pct = body.decision_maker_pct === null || body.decision_maker_pct === '' ? null : Number(body.decision_maker_pct) || 0
  if (body.target_account_count !== undefined) update.target_account_count = body.target_account_count === null || body.target_account_count === '' ? null : Number(body.target_account_count) || 1
  if (body.campaign_name !== undefined && typeof body.campaign_name === 'string' && body.campaign_name.trim()) {
    update.campaign_name = body.campaign_name.trim().slice(0, 200)
  }
  if (body.headline !== undefined) {
    const h = typeof body.headline === 'string' ? body.headline.trim() : ''
    update.headline = h ? h.slice(0, 300) : null
  }
  if (body.ad_copy !== undefined) {
    const a = typeof body.ad_copy === 'string' ? body.ad_copy.trim() : ''
    update.ad_copy = a ? a.slice(0, 2000) : null
  }

  const { data, error } = await sb
    .from('linkedin_campaigns')
    .update(update)
    .eq('id', id)
    .select('*, accounts(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: data })
}

// DELETE removes the row from our DB. Does NOT pause or delete the remote LinkedIn
// ad object — draft campaigns are managed in LinkedIn Campaign Manager.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await getSupabase().from('linkedin_campaigns').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
