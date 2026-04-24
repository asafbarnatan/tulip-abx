import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const VALID_PLAY_TYPES = ['outbound', 'inbound', 'event', 'exec', 'demo', 'cs_expansion', 'content']
const VALID_TEAMS = ['marketing', 'sales', 'sdr', 'cs']

// GET /api/custom-plays?accountId=X — list custom plays for an account.
// Scoped query is required (accountId) because custom plays are per-account;
// listing all of them across the platform has no use case.
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId')
  if (!accountId) {
    return NextResponse.json({ error: 'accountId query param is required' }, { status: 400 })
  }
  const { data, error } = await getSupabase()
    .from('custom_plays')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plays: data ?? [] })
}

// POST /api/custom-plays — create a new custom play for one account.
// Body must include: account_id, name. All other fields have sensible defaults
// matching the table CHECK constraints.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const accountId = body?.account_id
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!accountId || typeof accountId !== 'string') {
    return NextResponse.json({ error: 'account_id is required' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const playType = typeof body.play_type === 'string' && VALID_PLAY_TYPES.includes(body.play_type)
    ? body.play_type : 'outbound'
  const ownerTeam = typeof body.owner_team === 'string' && VALID_TEAMS.includes(body.owner_team)
    ? body.owner_team : 'sales'
  const durationDays = Number.isFinite(Number(body.duration_days))
    ? Math.max(1, Math.min(365, Math.floor(Number(body.duration_days))))
    : 14
  const assets = Array.isArray(body.assets)
    ? body.assets.filter((a: unknown): a is string => typeof a === 'string' && !!a.trim()).map((a: string) => a.trim().slice(0, 300)).slice(0, 20)
    : []

  const row = {
    account_id: accountId,
    name: name.slice(0, 200),
    description: typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : '',
    play_type: playType,
    owner_team: ownerTeam,
    duration_days: durationDays,
    assets,
    sample_outreach_opener: typeof body.sample_outreach_opener === 'string' ? body.sample_outreach_opener.trim().slice(0, 4000) : '',
    expected_outcome: typeof body.expected_outcome === 'string' ? body.expected_outcome.trim().slice(0, 1000) : '',
    created_by_name: typeof body.created_by_name === 'string' && body.created_by_name.trim() ? body.created_by_name.trim().slice(0, 200) : null,
    created_by_role: typeof body.created_by_role === 'string' && body.created_by_role.trim() ? body.created_by_role.trim().slice(0, 100) : null,
  }

  const { data, error } = await getSupabase()
    .from('custom_plays')
    .insert(row)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ play: data })
}
