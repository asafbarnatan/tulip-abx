import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// POST /api/linkedin/campaigns/reorder
// Body: { ids: string[] } — campaign ids in the desired new top-down order.
// Writes display_order = index for each id. Pinned campaigns keep their
// pinned_at — they'll still sort above these indices per the GET route.
//
// We issue one UPDATE per id in parallel. For a demo with <10 campaigns this
// is fine; at 100+ rows we'd want a single SQL statement via a stored proc.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const ids = body?.ids
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) {
    return NextResponse.json({ error: 'ids must be an array of strings' }, { status: 400 })
  }
  if (ids.length === 0) return NextResponse.json({ ok: true, updated: 0 })

  const sb = getSupabase()
  const results = await Promise.all(
    ids.map((id, index) =>
      sb.from('linkedin_campaigns').update({ display_order: index }).eq('id', id)
    )
  )
  const firstError = results.find(r => r.error)
  if (firstError?.error) {
    return NextResponse.json({ error: firstError.error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, updated: ids.length })
}
