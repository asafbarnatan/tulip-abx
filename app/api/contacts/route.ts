import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// Create a real contact — used by both ContactResearchAgent approval flow and manual entry form.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    account_id,
    name,
    title,
    persona_type,
    linkedin_url,
    source_url,
    email,
    phone,
    inferred_pain_points,
    preferred_channel,
  } = body

  if (!account_id || !name || !title || !persona_type) {
    return NextResponse.json({ error: 'account_id, name, title, persona_type are required' }, { status: 400 })
  }

  const contactRow: Record<string, unknown> = {
    account_id,
    name,
    title,
    persona_type,
    linkedin_url: linkedin_url ?? null,
    source_url: source_url ?? linkedin_url ?? null,
    email: email ?? null,
    phone: phone ?? null,
    inferred_pain_points: Array.isArray(inferred_pain_points) ? inferred_pain_points : [],
    preferred_channel: preferred_channel ?? 'email',
  }

  const { data, error } = await getSupabase()
    .from('contacts')
    .insert(contactRow)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const account_id = searchParams.get('account_id')

  let query = getSupabase().from('contacts').select('*').order('persona_type')
  if (account_id) query = query.eq('account_id', account_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data ?? [] })
}
