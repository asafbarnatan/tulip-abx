import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const VALID_PLAY_TYPES = ['outbound', 'inbound', 'event', 'exec', 'demo', 'cs_expansion', 'content']
const VALID_TEAMS = ['marketing', 'sales', 'sdr', 'cs']

// PATCH /api/custom-plays/[id] — update any subset of editable fields.
// account_id, id, and timestamps cannot be edited.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.name !== undefined && typeof body.name === 'string') {
    const n = body.name.trim()
    if (!n) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    update.name = n.slice(0, 200)
  }
  if (body.description !== undefined && typeof body.description === 'string') {
    update.description = body.description.trim().slice(0, 2000)
  }
  if (body.play_type !== undefined && typeof body.play_type === 'string') {
    if (!VALID_PLAY_TYPES.includes(body.play_type)) {
      return NextResponse.json({ error: `play_type must be one of ${VALID_PLAY_TYPES.join(', ')}` }, { status: 400 })
    }
    update.play_type = body.play_type
  }
  if (body.owner_team !== undefined && typeof body.owner_team === 'string') {
    if (!VALID_TEAMS.includes(body.owner_team)) {
      return NextResponse.json({ error: `owner_team must be one of ${VALID_TEAMS.join(', ')}` }, { status: 400 })
    }
    update.owner_team = body.owner_team
  }
  if (body.duration_days !== undefined) {
    const n = Number(body.duration_days)
    if (!Number.isFinite(n) || n < 1 || n > 365) {
      return NextResponse.json({ error: 'duration_days must be 1..365' }, { status: 400 })
    }
    update.duration_days = Math.floor(n)
  }
  if (body.assets !== undefined) {
    if (!Array.isArray(body.assets)) {
      return NextResponse.json({ error: 'assets must be an array of strings' }, { status: 400 })
    }
    update.assets = body.assets
      .filter((a: unknown): a is string => typeof a === 'string' && !!a.trim())
      .map((a: string) => a.trim().slice(0, 300))
      .slice(0, 20)
  }
  if (body.sample_outreach_opener !== undefined && typeof body.sample_outreach_opener === 'string') {
    update.sample_outreach_opener = body.sample_outreach_opener.trim().slice(0, 4000)
  }
  if (body.expected_outcome !== undefined && typeof body.expected_outcome === 'string') {
    update.expected_outcome = body.expected_outcome.trim().slice(0, 1000)
  }

  if (Object.keys(update).length === 1) { // only updated_at
    return NextResponse.json({ error: 'No editable fields in request body' }, { status: 400 })
  }

  const { data, error } = await getSupabase()
    .from('custom_plays')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ play: data })
}

// DELETE /api/custom-plays/[id] — hard delete. Also cleans up any linked
// account_actions rows that were activations of this specific play, so
// deleting a custom play removes it from both the Plays tab AND the Actions
// tab (matching the library-play deactivate flow).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = getSupabase()

  // Find any account_actions whose notes JSON references this play id and
  // delete them first (they lose meaning once the play definition is gone).
  // We do this client-side with a fetch + filter because Supabase's JSON
  // querying against text-stored JSON is awkward.
  const { data: actions } = await sb
    .from('account_actions')
    .select('id, notes')
    .eq('outcome', 'play_activated')
  const orphanIds: string[] = []
  for (const a of actions ?? []) {
    try {
      const n = JSON.parse(a.notes ?? '{}')
      if (n?.play_id === id) orphanIds.push(a.id)
    } catch { /* skip non-JSON notes */ }
  }
  if (orphanIds.length > 0) {
    await sb.from('account_actions').delete().in('id', orphanIds)
  }

  const { error } = await sb.from('custom_plays').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, orphan_actions_deleted: orphanIds.length })
}
