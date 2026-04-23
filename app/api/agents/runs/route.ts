import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') ?? '30')
  const agent_name = searchParams.get('agent_name')
  const account_id = searchParams.get('account_id')

  let query = getSupabase()
    .from('agent_runs')
    .select('*, accounts(name)')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (agent_name) query = query.eq('agent_name', agent_name)
  if (account_id) query = query.eq('account_id', account_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data ?? [] })
}
