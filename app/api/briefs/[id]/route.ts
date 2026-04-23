import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const VALID_TONES = ['consultative', 'challenger', 'empathetic', 'technical', 'executive']

// DELETE /api/briefs/[id] — hard-deletes a single positioning brief. Used by the
// admin cleanup flow when an agent regeneration produces content that regresses
// on manually-edited improvements (i.e. we want to revert to the prior brief).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await getSupabase().from('positioning_briefs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/briefs/[id]
// Accepts a partial update for any subset of the 10 positioning-brief fields.
// Does NOT touch approved or generated_at. Intended for team-alignment edits,
// not for re-approval workflows.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  // positioning_statement — April Dunford JSONB object
  if (body.positioning_statement !== undefined) {
    if (body.positioning_statement === null) {
      update.positioning_statement = null
    } else if (typeof body.positioning_statement === 'object') {
      const ps = body.positioning_statement as Record<string, unknown>
      update.positioning_statement = {
        for: typeof ps.for === 'string' ? ps.for.trim().slice(0, 500) : '',
        category: typeof ps.category === 'string' ? ps.category.trim().slice(0, 500) : '',
        key_benefit: typeof ps.key_benefit === 'string' ? ps.key_benefit.trim().slice(0, 500) : '',
        unlike: typeof ps.unlike === 'string' ? ps.unlike.trim().slice(0, 500) : '',
        because: typeof ps.because === 'string' ? ps.because.trim().slice(0, 500) : '',
      }
    }
  }

  if (body.core_message !== undefined && typeof body.core_message === 'string') {
    update.core_message = body.core_message.trim().slice(0, 4000)
  }

  if (body.key_themes !== undefined) {
    if (Array.isArray(body.key_themes)) {
      update.key_themes = body.key_themes
        .filter((t: unknown): t is string => typeof t === 'string' && !!t.trim())
        .map((t: string) => t.trim().slice(0, 300))
        .slice(0, 10)
    }
  }

  if (body.persona_messages !== undefined) {
    if (body.persona_messages && typeof body.persona_messages === 'object' && !Array.isArray(body.persona_messages)) {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(body.persona_messages as Record<string, unknown>)) {
        if (typeof v === 'string' && v.trim()) {
          out[k.slice(0, 200)] = v.trim().slice(0, 2000)
        }
      }
      update.persona_messages = out
    }
  }

  if (body.proof_points !== undefined) {
    if (Array.isArray(body.proof_points)) {
      update.proof_points = body.proof_points
        .filter((p: unknown): p is string => typeof p === 'string' && !!p.trim())
        .map((p: string) => p.trim().slice(0, 500))
        .slice(0, 12)
    }
  }

  if (body.objection_handlers !== undefined) {
    if (Array.isArray(body.objection_handlers)) {
      update.objection_handlers = body.objection_handlers
        .filter((o: unknown): o is { objection: unknown; response: unknown } => !!o && typeof o === 'object')
        .map((o: { objection: unknown; response: unknown }) => ({
          objection: typeof o.objection === 'string' ? o.objection.trim().slice(0, 500) : '',
          response: typeof o.response === 'string' ? o.response.trim().slice(0, 1000) : '',
        }))
        .filter((o: { objection: string; response: string }) => o.objection && o.response)
        .slice(0, 10)
    }
  }

  if (body.recommended_tone !== undefined && typeof body.recommended_tone === 'string') {
    if (VALID_TONES.includes(body.recommended_tone)) {
      update.recommended_tone = body.recommended_tone
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await getSupabase()
    .from('positioning_briefs')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ brief: data })
}
