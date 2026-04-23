import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// One-off cleanup: removes the agent-generated ENGAGEMENT synthesis signals and
// any play actions that still carry the old performed_by string ("Tulip ...",
// "Sales AE", or a fabricated-looking "First Last" with no assigned_role/assigned_name).
//
// Manually-logged actions (ones with an outcome set OR with assigned_role/assigned_name)
// are left alone. Press releases, news, and firmographic signals are never touched.
//
// Guarded by a header token so it cannot be fired accidentally from the UI.
const GUARD_TOKEN = 'regen-cleanup-2026-04'

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-cleanup-token')
  if (token !== GUARD_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const report: Record<string, unknown> = {}

  // 1) Delete synthesized signals (source contains "AccountIntelligence" or "synthesis")
  const { data: synthSignals } = await supabase
    .from('signals')
    .select('id, account_id, source')
    .or('source.ilike.%AccountIntelligence%,source.ilike.%synthesis%')
  if (synthSignals && synthSignals.length > 0) {
    const ids = synthSignals.map(s => s.id)
    const { error } = await supabase.from('signals').delete().in('id', ids)
    if (error) return NextResponse.json({ error: `signal cleanup failed: ${error.message}` }, { status: 500 })
    report.deleted_synthesized_signals = ids.length
  } else {
    report.deleted_synthesized_signals = 0
  }

  // 2) Delete agent-generated play actions (no outcome, no real human assignment)
  const { data: candidateActions } = await supabase
    .from('account_actions')
    .select('id, account_id, performed_by, outcome, assigned_role, assigned_name, notes')

  let deletedPlayActions = 0
  if (candidateActions) {
    const toDelete: string[] = []
    for (const a of candidateActions) {
      const hasHumanAssignment = !!a.assigned_role || !!a.assigned_name
      const outcome = (a.outcome ?? '').trim().toLowerCase()
      const hasRealOutcome = outcome.length > 0 && outcome !== 'pending' && outcome !== 'draft'
      if (hasHumanAssignment || hasRealOutcome) continue // keep manually-logged or reviewed

      const pb = (a.performed_by ?? '').trim()
      const looksAgentGenerated =
        !pb ||
        pb.startsWith('Tulip') ||
        ['Sales AE', 'Marketing', 'SDR', 'CSM', 'Ecosystem'].includes(pb) ||
        /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(pb) // fabricated-looking "First Last"
      if (looksAgentGenerated) toDelete.push(a.id)
    }
    if (toDelete.length > 0) {
      const { error } = await supabase.from('account_actions').delete().in('id', toDelete)
      if (error) return NextResponse.json({ error: `action cleanup failed: ${error.message}` }, { status: 500 })
      deletedPlayActions = toDelete.length
    }
  }
  report.deleted_play_actions = deletedPlayActions

  return NextResponse.json({ ok: true, ...report })
}
