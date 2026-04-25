import Anthropic from '@anthropic-ai/sdk'
import { createWithRetry } from './anthropic-retry'
import {
  tool_get_account,
  tool_get_contacts,
  tool_get_recommended_plays,
  tool_get_positioning_brief,
  tool_get_account_actions,
  tool_create_account_action,
  createAgentRun,
  appendAgentStep,
  completeAgentRun,
  failAgentRun,
} from './agent-tools'
import type { IndustryVertical, Geography, LifecycleStage } from '@/lib/database.types'
import {
  TULIP_CORE_PHILOSOPHY,
  TULIP_VERIFIED_ROSTER,
  TULIP_AI_FEATURES,
  TULIP_BANNED_PHRASES,
  ACCOUNT_NAME_PRECISION,
  ZERO_FABRICATION_RULES,
} from './content-rules'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_account',
    description: 'Fetch full account record.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
  },
  {
    name: 'get_contacts',
    description: 'Fetch buying group with persona types and pain points.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
  },
  {
    name: 'get_recommended_plays',
    description: 'Get the 3-5 most relevant plays from the play library for this account.',
    input_schema: {
      type: 'object',
      properties: {
        lifecycle_stage: { type: 'string' },
        industry_vertical: { type: 'string' },
        geography: { type: 'string' },
        digital_maturity: { type: 'number' },
        tier: { type: 'number' },
      },
      required: ['lifecycle_stage', 'industry_vertical', 'geography', 'digital_maturity', 'tier'],
    },
  },
  {
    name: 'get_positioning_brief',
    description: 'Get the latest approved positioning brief to align play copy with messaging.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
  },
  {
    name: 'get_account_actions',
    description: 'Get recent actions to avoid recommending plays already in motion.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' }, days: { type: 'number' } }, required: ['account_id'] },
  },
  {
    name: 'create_account_action',
    description: 'Log a recommended play as a pending account action with personalized copy in notes.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        action_type: { type: 'string', enum: ['email', 'call', 'meeting', 'linkedin', 'event', 'content_send', 'demo', 'proposal', 'other'] },
        performed_by: { type: 'string' },
        team: { type: 'string', enum: ['marketing', 'sales', 'cs', 'sdr'] },
        contact_name: { type: 'string' },
        notes: { type: 'string', description: 'Personalized outreach copy and play description' },
      },
      required: ['account_id', 'action_type', 'performed_by', 'team', 'notes'],
    },
  },
]

async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'get_account': return tool_get_account(input.account_id as string)
    case 'get_contacts': return tool_get_contacts(input.account_id as string)
    case 'get_recommended_plays': return tool_get_recommended_plays(
      input.lifecycle_stage as LifecycleStage,
      input.industry_vertical as IndustryVertical,
      input.geography as Geography,
      input.digital_maturity as number,
      input.tier as number
    )
    case 'get_positioning_brief': return tool_get_positioning_brief(input.account_id as string)
    case 'get_account_actions': return tool_get_account_actions(input.account_id as string, input.days as number | undefined)
    case 'create_account_action': return tool_create_account_action(
      input.account_id as string,
      input.action_type as string,
      input.performed_by as string,
      input.team as string,
      input.contact_name as string | null,
      input.notes as string
    )
    default: throw new Error(`Unknown tool: ${name}`)
  }
}

export async function runPlayOrchestratorAgent(
  account_id: string,
  onStep: (step: object) => void,
  intelligence_summary?: string,
  trigger_source = 'manual'
): Promise<{ run_id: string; output_summary: string }> {
  const run = await createAgentRun('PlayOrchestratorAgent', account_id, `Orchestrating plays for ${account_id}`, trigger_source)
  const started_at = run.started_at

  const emitStep = async (step: string, message: string, tool_call?: string) => {
    const s = { ts: new Date().toISOString(), agent: 'PlayOrchestratorAgent', step, message, tool_call }
    onStep(s)
    await appendAgentStep(run.id, s)
  }

  try {
    await emitStep('initializing', 'Starting play orchestration...')

    const contextNote = intelligence_summary
      ? `\n\nACCOUNT INTELLIGENCE (from AccountIntelligenceAgent):\n${intelligence_summary}`
      : ''

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `You are the PlayOrchestratorAgent. Select and personalize the best plays for account ${account_id}.

Steps:
1. get_account — understand the account's stage, vertical, and maturity
2. get_contacts — know who to target in each play
3. get_recommended_plays — get the relevant plays from the library
4. get_positioning_brief — align play copy with approved messaging (if available)
5. get_account_actions — avoid duplicating recent outreach
6. create_account_action for each top play (max 3) — the notes field MUST be a JSON string in the exact schema below

${TULIP_CORE_PHILOSOPHY}

${TULIP_VERIFIED_ROSTER}

${TULIP_AI_FEATURES}

${TULIP_BANNED_PHRASES}

${ACCOUNT_NAME_PRECISION}

${ZERO_FABRICATION_RULES}

NOTES FIELD — STRUCTURED JSON (the UI parses this literally):

notes must be a JSON string with exactly these keys, nothing else:
{
  "play_name": "string — the play from the library",
  "target": "string — the specific contact name + title, e.g. 'Claudia Becker, Quality Assurance Lead'",
  "why_now": [
    "Short complete sentence explaining why this contact, now.",
    "Another short complete sentence.",
    "Optional third."
  ],
  "opener": "string — the 2-3 sentence personalized outreach draft the rep would send",
  "rationale": [
    "Short sentence on the strategic rationale.",
    "Another short sentence.",
    "Optional third."
  ]
}

Format rules:
- notes MUST be valid JSON (parseable by JSON.parse). Serialize it with JSON.stringify before sending.
- why_now and rationale are arrays of 2-3 complete sentences each. Each item is a standalone readable sentence. Never a fragment, never starts with "-" or "*".
- opener is the raw personalized outreach copy a human would literally send — use "you" and "your" freely here; it is customer-facing.
- why_now and rationale are INTERNAL — do not use "you"/"your", refer to the contact in third person.
- Set performed_by to the role playing this action (e.g., "Sales AE", "Marketing", "SDR", "CSM") — NEVER a fabricated person's name. The Tulip team will attach a real person later via the Assign UI.
- contact_name must match a real contact returned from get_contacts.

GROUNDING RULES (zero fabrication — non-negotiable):
- Every fact you put in why_now and opener MUST be quotable from: get_account (description, industry_vertical, geography, score fields), get_contacts (persona_type, inferred_pain_points), get_positioning_brief (positioning_statement, key_themes, proof_points), the recent signals on the account, OR the ACCOUNT INTELLIGENCE CONTEXT if provided.
- NEVER invent sources, vendor names, or data providers. Forbidden strings unless they literally appear in the data above: "6sense", "Bombora", "G2 research", "TechTarget intent", "ZoomInfo intent", "Gartner says", "analyst report". The reader will check.
- NEVER invent specific numbers. No "revenue grew 23%", no "closed a $4M deal", no "hired 47 engineers", no "$200M investment" unless the number literally appears in account.description, a signal, or the brief. If you need a qualitative claim, use qualitative language ("expanding", "investing heavily", "ramping production") rather than faking precision.
- If the positioning brief is missing, say so in rationale ("No approved brief — opener anchored in account signals only") rather than inventing a category phrase or strategic pillar.
- If no signals are present, base why_now on the account's stated lifecycle stage, tier, and vertical — and say in rationale "baseline play; no fresh signals."${contextNote}`,
      },
    ]

    let playsCreated = 0

    while (true) {
      const response = await createWithRetry(anthropic, {
        model: 'claude-opus-4-6',
        max_tokens: 2500,
        tools: TOOLS,
        messages,
      })

      if (response.stop_reason === 'end_turn') break
      if (response.stop_reason !== 'tool_use') break

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          await emitStep('tool_call', `Calling ${block.name}...`, block.name)
          try {
            const result = await executeTool(block.name, block.input as Record<string, unknown>)
            if (block.name === 'create_account_action') playsCreated++
            await emitStep('tool_result', block.name === 'create_account_action'
              ? `Play action logged (${playsCreated} total)`
              : `${block.name} completed`)
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

    const output = `${playsCreated} personalized play actions created`
    await emitStep('complete', `Play orchestration complete — ${playsCreated} plays drafted`)
    await completeAgentRun(run.id, output, started_at)
    return { run_id: run.id, output_summary: output }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await emitStep('error', `Agent failed: ${msg}`)
    await failAgentRun(run.id, msg, started_at)
    throw err
  }
}
