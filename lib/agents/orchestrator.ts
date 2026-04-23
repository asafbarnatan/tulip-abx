import { runAccountIntelligenceAgent } from './AccountIntelligenceAgent'
import { runPositioningAgent } from './PositioningAgent'
import { runPlayOrchestratorAgent } from './PlayOrchestratorAgent'
import { runLinkedInOutreachAgent } from './LinkedInOutreachAgent'
import { runSignalWatcherAgent } from './SignalWatcherAgent'

export type PipelineType = 'full' | 'intelligence' | 'positioning' | 'plays' | 'linkedin' | 'signal-watch'

function encodeSSE(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export function runAgentPipeline(
  pipeline: PipelineType,
  account_id: string | null,
  trigger_source = 'manual'
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(encodeSSE(data)))
        } catch {
          // stream may be closed
        }
      }

      const onStep = (step: object) => send(step)

      try {
        if (pipeline === 'signal-watch') {
          send({ type: 'pipeline_start', pipeline: 'signal-watch', ts: new Date().toISOString() })
          const result = await runSignalWatcherAgent(onStep, trigger_source)
          send({ type: 'pipeline_complete', pipeline: 'signal-watch', urgency_rankings: result.urgency_rankings, ts: new Date().toISOString() })
          controller.close()
          return
        }

        if (!account_id) {
          send({ type: 'error', message: 'account_id required for this pipeline' })
          controller.close()
          return
        }

        send({ type: 'pipeline_start', pipeline, account_id, ts: new Date().toISOString() })

        let intelligence_summary: string | undefined

        if (pipeline === 'full' || pipeline === 'intelligence') {
          send({ type: 'agent_start', agent: 'AccountIntelligenceAgent', ts: new Date().toISOString() })
          const result = await runAccountIntelligenceAgent(account_id, onStep, trigger_source)
          intelligence_summary = result.output_summary
          send({ type: 'agent_complete', agent: 'AccountIntelligenceAgent', output_summary: result.output_summary, run_id: result.run_id, ts: new Date().toISOString() })
        }

        if (pipeline === 'full' || pipeline === 'positioning') {
          send({ type: 'agent_start', agent: 'PositioningAgent', ts: new Date().toISOString() })
          const result = await runPositioningAgent(account_id, onStep, intelligence_summary, trigger_source)
          send({ type: 'agent_complete', agent: 'PositioningAgent', output_summary: result.output_summary, run_id: result.run_id, ts: new Date().toISOString() })
        }

        if (pipeline === 'full' || pipeline === 'plays') {
          send({ type: 'agent_start', agent: 'PlayOrchestratorAgent', ts: new Date().toISOString() })
          const result = await runPlayOrchestratorAgent(account_id, onStep, intelligence_summary, trigger_source)
          send({ type: 'agent_complete', agent: 'PlayOrchestratorAgent', output_summary: result.output_summary, run_id: result.run_id, ts: new Date().toISOString() })
        }

        if (pipeline === 'full' || pipeline === 'linkedin') {
          send({ type: 'agent_start', agent: 'LinkedInOutreachAgent', ts: new Date().toISOString() })
          const result = await runLinkedInOutreachAgent(account_id, onStep, trigger_source)
          send({ type: 'agent_complete', agent: 'LinkedInOutreachAgent', output_summary: result.output_summary, run_id: result.run_id, ts: new Date().toISOString() })
        }

        send({ type: 'pipeline_complete', pipeline, account_id, ts: new Date().toISOString() })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send({ type: 'pipeline_error', message, ts: new Date().toISOString() })
      } finally {
        controller.close()
      }
    },
  })
}
