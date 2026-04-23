import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { zoomInfoSearchCompany, zoomInfoEnrichCompany } from '@/lib/zoominfo'

// POST /api/integrations/zoominfo/enrich
// Body: { account_id }
// Finds the ZoomInfo companyId (search by name if we don't have one cached), then enriches
// the account row in place with firmographics.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { account_id?: string } | null
  const accountId = body?.account_id
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const supabase = getSupabase()
  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (accErr || !account) return NextResponse.json({ error: 'account not found' }, { status: 404 })

  let companyId: string | null = account.zoominfo_company_id ?? null

  if (!companyId) {
    const hit = await zoomInfoSearchCompany(account.name)
    if (!hit) {
      return NextResponse.json(
        { error: `No ZoomInfo company found for "${account.name}". Check credentials or company name.` },
        { status: 404 },
      )
    }
    companyId = hit.id
    await supabase.from('accounts').update({ zoominfo_company_id: companyId, updated_at: new Date().toISOString() }).eq('id', accountId)
  }

  const enriched = await zoomInfoEnrichCompany(companyId)
  if (!enriched) {
    return NextResponse.json({ error: 'ZoomInfo enrich returned no data' }, { status: 502 })
  }

  // Only overwrite fields where ZoomInfo has data; preserve existing values if ZoomInfo blank.
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof enriched.employees === 'number' && enriched.employees > 0) updates.employee_count = enriched.employees
  if (enriched.revenue) updates.revenue_estimate = enriched.revenue
  if (enriched.headquarters && !account.headquarters) updates.headquarters = enriched.headquarters
  if (enriched.description && !account.description) updates.description = enriched.description

  const { data: updated, error: updErr } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', accountId)
    .select()
    .single()

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ account: updated, zoominfo: enriched })
}
