import Anthropic from '@anthropic-ai/sdk'
import { createWithRetry } from './anthropic-retry'
import {
  tool_get_account,
  tool_get_contacts,
  tool_get_signals,
  tool_get_account_actions,
  tool_update_account_scores,
  tool_create_signal,
  createAgentRun,
  appendAgentStep,
  completeAgentRun,
  failAgentRun,
} from './agent-tools'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_account',
    description: 'Fetch full account record including scores, lifecycle stage, digital maturity, and firmographics.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
  },
  {
    name: 'get_contacts',
    description: 'Fetch all contacts (buying group) for an account including persona types and pain points.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
  },
  {
    name: 'get_signals',
    description: 'Fetch recent signals for an account (intent, news, engagement, firmographic).',
    input_schema: {
      type: 'object',
      properties: { account_id: { type: 'string' }, limit: { type: 'number' } },
      required: ['account_id'],
    },
  },
  {
    name: 'get_account_actions',
    description: 'Fetch recent actions logged against this account (calls, emails, meetings, demos).',
    input_schema: {
      type: 'object',
      properties: { account_id: { type: 'string' }, days: { type: 'number' } },
      required: ['account_id'],
    },
  },
  {
    name: 'update_account_scores',
    description: 'Update the intent_score and engagement_score on the account based on signal analysis.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        intent_score: { type: 'number', description: '0-100' },
        engagement_score: { type: 'number', description: '0-100' },
      },
      required: ['account_id', 'intent_score', 'engagement_score'],
    },
  },
  {
    name: 'create_signal',
    description: 'Create a synthesized intelligence signal when you infer new context about the account.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        signal_type: { type: 'string', enum: ['intent', 'engagement', 'news', 'firmographic', 'product_usage'] },
        source: { type: 'string' },
        content: { type: 'string' },
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
      },
      required: ['account_id', 'signal_type', 'source', 'content', 'sentiment'],
    },
  },
]

async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'get_account': return tool_get_account(input.account_id as string)
    case 'get_contacts': return tool_get_contacts(input.account_id as string)
    case 'get_signals': return tool_get_signals(input.account_id as string, input.limit as number | undefined)
    case 'get_account_actions': return tool_get_account_actions(input.account_id as string, input.days as number | undefined)
    case 'update_account_scores': return tool_update_account_scores(input.account_id as string, input.intent_score as number, input.engagement_score as number)
    case 'create_signal': return tool_create_signal(input.account_id as string, input.signal_type as string, input.source as string, input.content as string, input.sentiment as string)
    default: throw new Error(`Unknown tool: ${name}`)
  }
}

export async function runAccountIntelligenceAgent(
  account_id: string,
  onStep: (step: object) => void,
  trigger_source = 'manual'
): Promise<{ run_id: string; output_summary: string }> {
  const run = await createAgentRun('AccountIntelligenceAgent', account_id, `Analyzing account ${account_id}`, trigger_source)
  const started_at = run.started_at

  const emitStep = async (step: string, message: string, tool_call?: string) => {
    const s = { ts: new Date().toISOString(), agent: 'AccountIntelligenceAgent', step, message, tool_call }
    onStep(s)
    await appendAgentStep(run.id, s)
  }

  try {
    await emitStep('initializing', 'Starting account intelligence analysis...')

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `You are the AccountIntelligenceAgent. Analyze account ${account_id} by calling the available tools.

Steps:
1. Call get_account to understand the account
2. Call get_contacts to understand the buying group
3. Call get_signals to review recent signals
4. Call get_account_actions to see recent touchpoints
5. Synthesize the intelligence — update scores if warranted, create a signal if you've inferred new context
6. Return a JSON intelligence summary

SIGNAL CONTENT RULES (when you call create_signal) — CRITICAL:
The content field renders on the Signals tab. The UI splits it as: the first sentence = bold headline, subsequent short sentences = bullets. Write accordingly.

- Sentence 1 (the headline): one declarative fact, 10-22 words, ending in a period. No colons, no "CRITICAL" prefixes, no ALL CAPS.
- Sentences 2-4 (supporting bullets): each is a short standalone sentence, 8-20 words, period-terminated. Max 3 of them.
- Every bullet must be independently readable. Never write a fragment that relies on the prior sentence for grammar.
- NO embedded "-" or "•" or markdown in the content. The UI adds the bullet dots.
- NO invented sources: cite only what real signals.source values show. Do not write "6sense intent spike", "Bombora research", "G2 research" unless those terms already appear in the signals data.
- NO competitor names, contract values, or M&A details you did not see in the data.
- For an ENGAGEMENT-GAP synthesis signal: name the specific gap (touchpoint count, contacts untouched, days of silence) grounded in get_account_actions + get_contacts output. Do not invent stakeholder quotes or strategic window framing that is not in the data.

Return ONLY valid JSON in your FINAL message (no tool calls in the final message):
{
  "account_name": string,
  "intelligence_summary": string (2-3 sentences of synthesized context),
  "top_buying_signals": string[],
  "urgency": "critical" | "high" | "medium" | "low",
  "urgency_reason": string,
  "recommended_next_action": string,
  "maturity_assessment": string,
  "updated_intent_score": number,
  "updated_engagement_score": number
}`,
      },
    ]

    let finalOutput = ''

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

    await emitStep('complete', 'Account intelligence analysis complete')
    await completeAgentRun(run.id, finalOutput.slice(0, 500), started_at)
    return { run_id: run.id, output_summary: finalOutput }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await emitStep('error', `Agent failed: ${msg}`)
    await failAgentRun(run.id, msg, started_at)
    throw err
  }
}
