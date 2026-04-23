import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// POST /api/agents/cancel
// Marks every running/pending agent_run as 'failed' so the UI stops showing them
// as in-flight. Note: this does NOT abort the in-memory Anthropic HTTP request
// that is already mid-call — Node can't interrupt a running fetch from outside
// the request that started it. The remaining Anthropic call will complete,
// consume tokens, and write a tool-result row, but the orchestrator will see
// the run flagged as 'failed' and skip further steps on the next tick.
//
// To hard-stop an in-flight run RIGHT NOW, the dev server process must be
// killed (Ctrl+C in the terminal running `npm run dev`).
export async function POST(_request: NextRequest) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('agent_runs')
    .update({
      status: 'failed',
      error_message: 'Cancelled by user (Stop All).',
      completed_at: new Date().toISOString(),
    })
    .in('status', ['running', 'pending'])
    .select('id, agent_name, status')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    cancelled: data?.length ?? 0,
    runs: data ?? [],
    note: 'DB rows flagged. To hard-stop an in-flight Anthropic call, restart the dev server.',
  })
}
