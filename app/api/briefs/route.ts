import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// GET /api/briefs?accountId=<uuid>  → latest brief for that account
// GET /api/briefs?accountId=<uuid>&limit=5 → recent briefs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  const limit = parseInt(searchParams.get('limit') ?? '1')
  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  }
  const { data, error } = await getSupabase()
    .from('positioning_briefs')
    .select('*')
    .eq('account_id', accountId)
    .order('generated_at', { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ briefs: data ?? [] })
}
