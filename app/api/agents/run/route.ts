import { NextRequest } from 'next/server'
import { runAgentPipeline, type PipelineType } from '@/lib/agents/orchestrator'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const { accountId, pipeline = 'full', trigger_source = 'manual' } = await request.json()

    if (pipeline !== 'signal-watch' && !accountId) {
      return new Response(JSON.stringify({ error: 'accountId required' }), { status: 400 })
    }

    const stream = runAgentPipeline(pipeline as PipelineType, accountId ?? null, trigger_source)

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
