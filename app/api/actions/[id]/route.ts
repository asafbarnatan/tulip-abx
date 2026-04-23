import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// assigned_role accepts free text — presets (AE/CSM/Sales/Marketing/Ecosystem)
// are just suggestions. A user with an unusual role (e.g. "VP Rev Ops",
// "Solutions Engineer") can type it in and it's stored verbatim, capped at 80 chars.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  const update: Record<string, unknown> = {}

  if ('assigned_role' in body) {
    const role = body.assigned_role
    if (role === null || role === '') {
      update.assigned_role = null
    } else if (typeof role === 'string') {
      update.assigned_role = role.trim().slice(0, 80) || null
    } else {
      return NextResponse.json({ error: 'assigned_role must be a string or null' }, { status: 400 })
    }
  }
  if ('assigned_name' in body) {
    const name = body.assigned_name
    if (name !== null && typeof name !== 'string') {
      return NextResponse.json({ error: 'assigned_name must be a string or null' }, { status: 400 })
    }
    update.assigned_name = name && typeof name === 'string' ? name.trim().slice(0, 120) || null : null
  }
  if ('notes' in body) update.notes = body.notes
  if ('outcome' in body) update.outcome = body.outcome
  if ('contact_name' in body) update.contact_name = body.contact_name

  // Full-editor fields — accepted with strict enum validation so we don't
  // corrupt the CHECK constraints on action_type / team.
  const VALID_ACTION_TYPES = ['email', 'call', 'meeting', 'linkedin', 'event', 'content_send', 'demo', 'proposal', 'other']
  if ('action_type' in body && typeof body.action_type === 'string') {
    if (!VALID_ACTION_TYPES.includes(body.action_type)) {
      return NextResponse.json({ error: `action_type must be one of ${VALID_ACTION_TYPES.join(', ')}` }, { status: 400 })
    }
    update.action_type = body.action_type
  }
  const VALID_TEAMS = ['marketing', 'sales', 'cs', 'sdr']
  if ('team' in body && typeof body.team === 'string') {
    if (!VALID_TEAMS.includes(body.team)) {
      return NextResponse.json({ error: `team must be one of ${VALID_TEAMS.join(', ')}` }, { status: 400 })
    }
    update.team = body.team
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await getSupabase()
    .from('account_actions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ action: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await getSupabase().from('account_actions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
