import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const FIELDS = ['name', 'title', 'persona_type', 'email', 'phone', 'linkedin_url', 'source_url', 'inferred_pain_points', 'preferred_channel']

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const update: Record<string, unknown> = {}
  for (const f of FIELDS) {
    if (f in body) update[f] = body[f]
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }
  const { data, error } = await getSupabase().from('contacts').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await getSupabase().from('contacts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
