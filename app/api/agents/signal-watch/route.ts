import { runAgentPipeline } from '@/lib/agents/orchestrator'

export const maxDuration = 300

export async function POST() {
  const stream = runAgentPipeline('signal-watch', null, 'manual')
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
