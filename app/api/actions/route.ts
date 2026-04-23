import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId')
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('account_actions')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ actions: data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    account_id, action_type, performed_by, team, contact_name, outcome, notes,
    assigned_name, assigned_role,
  } = body

  // Free-text role. Presets (AE/CSM/Sales/Marketing/Ecosystem) are UI suggestions
  // only; we store whatever the user typed, capped at 80 chars.
  let validatedRole: string | null = null
  if (typeof assigned_role === 'string' && assigned_role.trim()) {
    validatedRole = assigned_role.trim().slice(0, 80)
  }

  const row: Record<string, unknown> = {
    account_id, action_type, performed_by, team, contact_name, outcome, notes,
  }
  if (assigned_name != null && typeof assigned_name === 'string' && assigned_name.trim()) {
    row.assigned_name = assigned_name.trim().slice(0, 120)
  }
  if (validatedRole) {
    row.assigned_role = validatedRole
  }

  const { data, error } = await supabase
    .from('account_actions')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ action: data })
}
