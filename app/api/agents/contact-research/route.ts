import { NextRequest } from 'next/server'
import { runContactResearchAgent } from '@/lib/agents/ContactResearchAgent'

export const maxDuration = 300

function encodeSSE(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: NextRequest) {
  try {
    const { accountId, role, persona_type } = await request.json()

    if (!accountId || !role || !persona_type) {
      return new Response(JSON.stringify({ error: 'accountId, role, persona_type required' }), { status: 400 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          try { controller.enqueue(encoder.encode(encodeSSE(data))) } catch { /* stream closed */ }
        }
        try {
          send({ type: 'research_start', accountId, role, persona_type, ts: new Date().toISOString() })
          const result = await runContactResearchAgent(accountId, role, persona_type, send, 'manual')
          send({ type: 'research_complete', ...result, ts: new Date().toISOString() })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          send({ type: 'research_error', message: msg, ts: new Date().toISOString() })
        } finally {
          controller.close()
        }
      },
    })

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
