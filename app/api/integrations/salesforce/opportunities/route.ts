import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { salesforceListOpportunities } from '@/lib/salesforce'

// POST /api/integrations/salesforce/opportunities
// Body: { account_id }
// Pulls opportunities for the linked SF account and upserts into salesforce_opportunities.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { account_id?: string } | null
  const accountId = body?.account_id
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const sb = getSupabase()
  const { data: account, error: accErr } = await sb
    .from('accounts')
    .select('id, name, salesforce_account_id')
    .eq('id', accountId)
    .single()

  if (accErr || !account) return NextResponse.json({ error: 'account not found' }, { status: 404 })

  if (!account.salesforce_account_id) {
    return NextResponse.json(
      { error: 'Account is not linked to Salesforce. Call /api/integrations/salesforce/link-account first.' },
      { status: 400 },
    )
  }

  const opps = await salesforceListOpportunities(account.salesforce_account_id)

  const rows = opps.map(o => ({
    account_id: accountId,
    sf_opportunity_id: o.Id,
    name: o.Name ?? null,
    stage_name: o.StageName ?? null,
    amount: typeof o.Amount === 'number' ? o.Amount : null,
    close_date: o.CloseDate ?? null,
    probability: typeof o.Probability === 'number' ? o.Probability : null,
    owner_name: o.Owner?.Name ?? null,
    last_modified_at: o.LastModifiedDate ?? null,
    synced_at: new Date().toISOString(),
  }))

  let syncedCount = 0
  if (rows.length > 0) {
    const { error: upErr, count } = await sb
      .from('salesforce_opportunities')
      .upsert(rows, { onConflict: 'sf_opportunity_id', count: 'exact' })

    if (upErr) {
      await sb.from('app_settings').update({
        salesforce_last_sync_error: `Opportunity upsert failed: ${upErr.message}`,
        updated_at: new Date().toISOString(),
      }).eq('id', 1)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }
    syncedCount = count ?? rows.length
  }

  await sb.from('app_settings').update({
    salesforce_last_sync_at: new Date().toISOString(),
    salesforce_last_sync_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  return NextResponse.json({
    synced: syncedCount,
    opportunities: rows,
  })
}
