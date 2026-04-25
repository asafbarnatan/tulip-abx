import { runAccountIntelligenceAgent } from './AccountIntelligenceAgent'
import { runPositioningAgent } from './PositioningAgent'
import { runPlayOrchestratorAgent } from './PlayOrchestratorAgent'
import { runLinkedInOutreachAgent } from './LinkedInOutreachAgent'
import { runSignalWatcherAgent } from './SignalWatcherAgent'
import { runContactResearchAgent } from './ContactResearchAgent'
import { tool_get_contacts } from './agent-tools'

export type PipelineType = 'full' | 'intelligence' | 'positioning' | 'plays' | 'linkedin' | 'contact-research' | 'signal-watch'

// Find the highest-priority buying-group slot that has no contact yet. Returns
// null if Champion + Economic Buyer + Technical Evaluator are all already
// represented — no point burning Claude Opus on a duplicate hunt. Order matches
// how AEs actually qualify accounts: champion first, then economic buyer, then
// the technical gate.
async function findFirstEmptyPersonaSlot(account_id: string): Promise<{ persona_type: string; target_role: string } | null> {
  const contacts = await tool_get_contacts(account_id)
  const filledTypes = new Set(
    (contacts ?? [])
      .map((c: { persona_type?: string | null }) => c.persona_type)
      .filter((t): t is string => Boolean(t))
  )
  const PRIORITY_SLOTS: Array<{ persona_type: string; target_role: string }> = [
    { persona_type: 'Champion', target_role: 'VP Manufacturing or VP Operations' },
    { persona_type: 'Economic Buyer', target_role: 'COO or SVP Manufacturing' },
    { persona_type: 'Technical Evaluator', target_role: 'IT/OT Director or Head of Manufacturing IT' },
  ]
  for (const slot of PRIORITY_SLOTS) {
    if (!filledTypes.has(slot.persona_type)) return slot
  }
  return null
}

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

        // ContactResearch runs BEFORE Positioning so that the brief's per-persona
        // messages have real contacts to address. We fill at most ONE missing slot
        // per Full Pipeline run — keeps the run cheap and predictable. AEs who want
        // to fill more slots can run the standalone 'contact-research' pipeline.
        if (pipeline === 'full' || pipeline === 'contact-research') {
          const slot = await findFirstEmptyPersonaSlot(account_id)
          if (slot) {
            send({ type: 'agent_start', agent: 'ContactResearchAgent', ts: new Date().toISOString() })
            const result = await runContactResearchAgent(account_id, slot.target_role, slot.persona_type, onStep, trigger_source)
            send({ type: 'agent_complete', agent: 'ContactResearchAgent', output_summary: result.summary, run_id: result.run_id, ts: new Date().toISOString() })
          } else {
            send({ type: 'agent_skipped', agent: 'ContactResearchAgent', reason: 'Buying group already covers Champion, Economic Buyer, and Technical Evaluator', ts: new Date().toISOString() })
          }
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
