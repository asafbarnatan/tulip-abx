import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { salesforceSearchAccount } from '@/lib/salesforce'

// POST /api/integrations/salesforce/link-account
// Body: { account_id }
// Finds a matching Salesforce Account by name (fuzzy) and caches Id on the ABX account row.
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

  const match = await salesforceSearchAccount(account.name)
  if (!match) {
    return NextResponse.json({
      linked: false,
      reason: `No Salesforce Account found matching "${account.name}". Check the name or connection.`,
    })
  }

  const { error: updErr } = await sb
    .from('accounts')
    .update({ salesforce_account_id: match.Id, updated_at: new Date().toISOString() })
    .eq('id', accountId)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({
    linked: true,
    sf_account: {
      id: match.Id,
      name: match.Name,
      industry: match.Industry,
      website: match.Website,
      annual_revenue: match.AnnualRevenue,
    },
  })
}
