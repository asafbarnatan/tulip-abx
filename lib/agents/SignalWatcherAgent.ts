import Anthropic from '@anthropic-ai/sdk'
import {
  tool_list_accounts_with_signals,
  tool_get_unprocessed_signals,
  tool_mark_signal_processed,
  tool_update_account_intent_score,
  createAgentRun,
  appendAgentStep,
  completeAgentRun,
  failAgentRun,
} from './agent-tools'
import { createWithRetry } from './anthropic-retry'
import {
  TULIP_VERIFIED_ROSTER,
  ACCOUNT_NAME_PRECISION,
} from './content-rules'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_accounts_with_signals',
    description: 'List all accounts with their unprocessed signal counts.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_unprocessed_signals',
    description: 'Fetch all unprocessed signals across all accounts.',
    input_schema: { type: 'object', properties: { limit: { type: 'number' } } },
  },
  {
    name: 'mark_signal_processed',
    description: 'Mark signal IDs as processed after reviewing them.',
    input_schema: {
      type: 'object',
      properties: { signal_ids: { type: 'array', items: { type: 'string' } } },
      required: ['signal_ids'],
    },
  },
  {
    name: 'update_account_intent_score',
    description: 'Update an account\'s intent score based on signal analysis.',
    input_schema: {
      type: 'object',
      properties: { account_id: { type: 'string' }, intent_score: { type: 'number' } },
      required: ['account_id', 'intent_score'],
    },
  },
]

async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'list_accounts_with_signals': return tool_list_accounts_with_signals()
    case 'get_unprocessed_signals': return tool_get_unprocessed_signals(input.limit as number | undefined)
    case 'mark_signal_processed': return tool_mark_signal_processed(input.signal_ids as string[])
    case 'update_account_intent_score': return tool_update_account_intent_score(input.account_id as string, input.intent_score as number)
    default: throw new Error(`Unknown tool: ${name}`)
  }
}

export interface AccountUrgency {
  account_id: string
  account_name: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  urgency_reason: string
  signals_count: number
}

export async function runSignalWatcherAgent(
  onStep: (step: object) => void,
  trigger_source = 'manual'
): Promise<{ run_id: string; urgency_rankings: AccountUrgency[] }> {
  const run = await createAgentRun('SignalWatcherAgent', null, 'Sweeping all accounts for signal activity', trigger_source)
  const started_at = run.started_at

  const emitStep = async (step: string, message: string, tool_call?: string) => {
    const s = { ts: new Date().toISOString(), agent: 'SignalWatcherAgent', step, message, tool_call }
    onStep(s)
    await appendAgentStep(run.id, s)
  }

  try {
    await emitStep('initializing', 'Starting signal watch across all accounts...')

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `You are the SignalWatcherAgent. Sweep all accounts to prioritize the signal backlog.

Steps:
1. list_accounts_with_signals — see all accounts and their unprocessed signal counts
2. get_unprocessed_signals — fetch the actual signal content
3. For accounts with strong intent signals, update_account_intent_score
4. mark_signal_processed for signals you've reviewed
5. YOUR ABSOLUTE FINAL MESSAGE (after all tool calls are done) MUST be ONLY a JSON array with NO prose, NO markdown code fences, NO explanation — just raw JSON.

Final message format (exactly this, nothing else):
[
  {
    "account_id": "uuid-here",
    "account_name": "Bayer AG",
    "urgency": "critical",
    "urgency_reason": "Short 1-2 clause reason grounded in the actual signals",
    "signals_count": 3
  }
]

Rules:
- Include ALL 5 accounts in the rankings (not just ones with unprocessed signals)
- urgency values must be exactly: "critical" | "high" | "medium" | "low"
- Order by urgency (critical first)
- Do NOT wrap in markdown. Do NOT say "Here is the JSON:". Just output the raw array.

ZERO-FABRICATION RULES for urgency_reason (CRITICAL — read every word):
This field is shown on the CEO's Mission Control. If you write a phrase that is not supported by the actual data I gave you, the demo fails.

You MUST ONLY cite facts that appear in:
  (a) the get_unprocessed_signals result — the signals.content / signals.source fields
  (b) basic account facts from list_accounts_with_signals (name, tier, lifecycle_stage, scores)

You MUST NOT invent:
  - Intent-data vendor names you did not see in signals.source. Do NOT write "6sense intent spike", "Bombora research", "G2 research", "TechTarget intent" unless those exact source names appear in a signal's source field.
  - Competitor names that are not in the signals (no "Rockwell Plex competing", "Siemens Opcenter active", "Dassault MES in play" unless a signal says so).
  - M&A details that are not in the signals (no "Axonics acquisition adding 3 greenfield sites" unless the signal content names it).
  - Contract/legal narrative that is not in the signals (no "MSA in legal review", "unanswered security questionnaire", "IT blocker raised" unless a signal describes it).
  - Budget numbers that are not in the signals or account description (no "€200M modernization budget", "¥50B smart factory capex", "$12B DoD contracts" unless those exact numbers appear in the data).

urgency_reason should quote or paraphrase real signals. Good examples (only if the underlying signal exists):
  - "Daikin Fusion 25 ¥180B DX plan names 'connect equipment' deliverables; zero outbound actions in 30 days"
  - "Two manufacturing-defect recalls plus 4-site expansion opportunity; no CS touchpoints recently"

If an account has NO unprocessed signals, urgency is "low" or "medium" and urgency_reason should say something like "No new signals — maintain baseline monitoring" or cite lifecycle/tier only. Do not invent activity.

Keep urgency_reason under 220 characters. One or two clauses max.

${TULIP_VERIFIED_ROSTER}

${ACCOUNT_NAME_PRECISION}`,
      },
    ]

    let finalOutput = '[]'

    while (true) {
      const response = await createWithRetry(anthropic, {
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        tools: TOOLS,
        messages,
      })

      if (response.stop_reason === 'end_turn') {
        for (const block of response.content) {
          if (block.type === 'text' && block.text.trim()) {
            finalOutput = block.text.trim()
          }
        }
        console.log('[SignalWatcher] end_turn reached. finalOutput:', finalOutput.slice(0, 300))
        console.log('[SignalWatcher] full content blocks:', JSON.stringify(response.content).slice(0, 500))

        // If Claude stopped without producing the JSON, ask for it explicitly
        if (!finalOutput || finalOutput === '[]') {
          await emitStep('retry_json', 'Final JSON missing — requesting it explicitly')
          messages.push({ role: 'assistant', content: response.content })
          messages.push({
            role: 'user',
            content: 'You must now output ONLY the urgency rankings JSON array as described. No prose, no markdown. Just the raw JSON array starting with [ and ending with ].',
          })
          const followup = await createWithRetry(anthropic, {
            model: 'claude-opus-4-6',
            max_tokens: 2048,
            messages,
          })
          for (const block of followup.content) {
            if (block.type === 'text' && block.text.trim()) {
              finalOutput = block.text.trim()
            }
          }
          console.log('[SignalWatcher] followup finalOutput:', finalOutput.slice(0, 300))
        }
        break
      }
      if (response.stop_reason !== 'tool_use') break

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          await emitStep('tool_call', `Calling ${block.name}...`, block.name)
          try {
            const result = await executeTool(block.name, block.input as Record<string, unknown>)
            await emitStep('tool_result', `${block.name} completed`)
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            await emitStep('tool_error', `${block.name} failed: ${msg}`)
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${msg}`, is_error: true })
          }
        }
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })
    }

    let urgency_rankings: AccountUrgency[] = []
    try {
      let jsonText = finalOutput.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      const match = jsonText.match(/\[[\s\S]*\]/)
      if (match) jsonText = match[0]
      urgency_rankings = JSON.parse(jsonText)
    } catch (e) {
      console.log('[SignalWatcher] JSON parse failed:', (e as Error).message, 'finalOutput was:', finalOutput.slice(0, 500))
      urgency_rankings = []
    }

    await emitStep('complete', `Signal watch complete — ${urgency_rankings.length} accounts ranked`)
    await completeAgentRun(run.id, JSON.stringify(urgency_rankings), started_at)
    return { run_id: run.id, urgency_rankings }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await emitStep('error', `Agent failed: ${msg}`)
    await failAgentRun(run.id, msg, started_at)
    throw err
  }
}
