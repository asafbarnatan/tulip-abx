import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// GET /api/accounts/[id] — fetch a single account
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await getSupabase().from('accounts').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ account: data })
}

// PATCH /api/accounts/[id] — update a subset of account fields (lifecycle stage,
// scores, primary use case, AE assignment, etc.). Used by Mission Control edits
// and the demo-prep tooling.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  const VALID_STAGES = ['prospect', 'pipeline', 'customer', 'expansion']
  if (body.lifecycle_stage !== undefined) {
    if (!VALID_STAGES.includes(body.lifecycle_stage)) {
      return NextResponse.json({ error: `lifecycle_stage must be one of ${VALID_STAGES.join(', ')}` }, { status: 400 })
    }
    update.lifecycle_stage = body.lifecycle_stage
  }

  const VALID_INTERACTION_STAGES = [
    'prospecting', 'discovery', 'demo_eval', 'proposal', 'negotiation',
    'closed_won', 'onboarding', 'adoption', 'expansion', 'renewal',
    'closed_lost',
  ]
  if (body.interaction_stage !== undefined) {
    if (body.interaction_stage === null) {
      update.interaction_stage = null
    } else if (VALID_INTERACTION_STAGES.includes(body.interaction_stage)) {
      update.interaction_stage = body.interaction_stage
    } else {
      return NextResponse.json({ error: `interaction_stage must be one of ${VALID_INTERACTION_STAGES.join(', ')}` }, { status: 400 })
    }
  }
  if (body.tier !== undefined && [1, 2, 3].includes(body.tier)) update.tier = body.tier
  if (body.icp_fit_score !== undefined) update.icp_fit_score = Math.max(0, Math.min(100, Number(body.icp_fit_score) || 0))
  if (body.intent_score !== undefined) update.intent_score = Math.max(0, Math.min(100, Number(body.intent_score) || 0))
  if (body.engagement_score !== undefined) update.engagement_score = Math.max(0, Math.min(100, Number(body.engagement_score) || 0))
  if (body.primary_use_case !== undefined) update.primary_use_case = typeof body.primary_use_case === 'string' ? body.primary_use_case.trim().slice(0, 500) : null
  if (body.assigned_ae !== undefined) update.assigned_ae = typeof body.assigned_ae === 'string' ? body.assigned_ae.trim().slice(0, 200) : null

  const { data, error } = await getSupabase().from('accounts').update(update).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}
