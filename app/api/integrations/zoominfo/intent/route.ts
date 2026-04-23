import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { zoomInfoFetchIntentSignals } from '@/lib/zoominfo'

// POST /api/integrations/zoominfo/intent
// Body: { account_id }
// Pulls intent topics from ZoomInfo and materializes them as rows in `signals`.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { account_id?: string } | null
  const accountId = body?.account_id
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const supabase = getSupabase()
  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('id, name, zoominfo_company_id')
    .eq('id', accountId)
    .single()

  if (accErr || !account) return NextResponse.json({ error: 'account not found' }, { status: 404 })
  if (!account.zoominfo_company_id) {
    return NextResponse.json(
      { error: 'Account has no zoominfo_company_id yet — call /api/integrations/zoominfo/enrich first.' },
      { status: 400 },
    )
  }

  const topics = await zoomInfoFetchIntentSignals(account.zoominfo_company_id)

  if (topics.length === 0) {
    await supabase.from('app_settings').update({
      zoominfo_last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
    return NextResponse.json({ signals_created: 0 })
  }

  // signals table has no dedicated detected_at / intent_score_delta columns in the schema;
  // encode the topic + score + detected date into `content` so downstream UI can parse it.
  const rows = topics.map(t => ({
    account_id: accountId,
    signal_type: 'intent' as const,
    source: 'ZoomInfo',
    content: `${t.topic} (score ${t.score}${t.category ? `, ${t.category}` : ''}) — detected ${t.detected_at}`,
    sentiment: 'neutral' as const,
    processed: false,
  }))

  const { error: insErr } = await supabase.from('signals').insert(rows)
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // Nudge account's intent_score toward the max topic score — capped at 100.
  const maxScore = topics.reduce((m, t) => Math.max(m, t.score), 0)
  if (maxScore > 0) {
    const { data: acct } = await supabase
      .from('accounts')
      .select('intent_score')
      .eq('id', accountId)
      .single()
    const current = acct?.intent_score ?? 0
    const next = Math.min(100, Math.max(current, maxScore))
    if (next !== current) {
      await supabase.from('accounts').update({ intent_score: next, updated_at: new Date().toISOString() }).eq('id', accountId)
    }
  }

  await supabase.from('app_settings').update({
    zoominfo_last_sync_at: new Date().toISOString(),
    zoominfo_last_sync_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  return NextResponse.json({ signals_created: rows.length })
}
