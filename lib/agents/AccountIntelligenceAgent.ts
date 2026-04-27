import Anthropic from '@anthropic-ai/sdk'
import { createWithRetry } from './anthropic-retry'
import {
  tool_get_account,
  tool_get_contacts,
  tool_get_signals,
  tool_get_account_actions,
  tool_update_account_scores,
  tool_create_signal,
  tool_fetch_url,
  tool_cite_web_finding,
  tool_update_account_firmographics,
  createAgentRun,
  appendAgentStep,
  completeAgentRun,
  failAgentRun,
} from './agent-tools'
import {
  TULIP_VERIFIED_ROSTER,
  ACCOUNT_NAME_PRECISION,
  ZERO_FABRICATION_RULES,
  WEB_RESEARCH_RULES,
} from './content-rules'

// Feature flag — when "true", AccountIntelligenceAgent runs with web_search +
// fetch_url + cite_web_finding + update_account_firmographics tools, and the
// prompt instructs it to research firmographics, news, and intent signals
// from the public web. When unset or "false", the agent runs in DB-only mode
// (the original behavior). Default is OFF so curated content is preserved
// until you flip the flag in .env.local.
const WEB_RESEARCH_ENABLED = process.env.WEB_RESEARCH_ENABLED === 'true'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Web research tools — only added to TOOLS when WEB_RESEARCH_ENABLED is true.
// Kept as a separate const so the feature flag is mechanical: flag off, no
// tools, no behavior change.
const WEB_RESEARCH_TOOLS: Anthropic.Tool[] = [
  {
    name: 'fetch_url',
    description:
      'Fetch the full text of a URL so you can copy a verbatim quote. Returns the page text (HTML stripped). Use this AFTER web_search returns a relevant URL — quotes for cite_web_finding must come from the actual page text, not from web_search snippets (snippets can paraphrase).',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch (http or https).' },
      },
      required: ['url'],
    },
  },
  {
    name: 'cite_web_finding',
    description:
      'Save a web-sourced finding to the signals table. Pass the claim, the source URL you found it on, and the EXACT quote you copied verbatim from that URL. The orchestrator will (1) HEAD-check the URL is reachable, (2) fetch the page text and verify the quote substring is present. If either check fails, the finding is rejected and you receive the rejection reason. You cannot save a fact about this account without going through this tool.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        claim: { type: 'string', description: 'One declarative sentence — what the finding is.' },
        source_url: { type: 'string', description: 'A real, reachable http or https URL.' },
        exact_quote_from_source: { type: 'string', description: 'The verbatim text from that URL that backs the claim. ≥ 8 chars.' },
        category: { type: 'string', enum: ['firmographic', 'news', 'regulatory', 'intent_signal', 'product_usage'] },
        confidence: { type: 'number', description: '0.0-1.0, your honest read of how reliable the source is.' },
      },
      required: ['account_id', 'claim', 'source_url', 'exact_quote_from_source', 'category', 'confidence'],
    },
  },
  {
    name: 'update_account_firmographics',
    description:
      'Update firmographic fields on the account record (description, employee_count, revenue_estimate). Only writes when confidence >= 0.85 AND a previously-saved cite_web_finding (cited_signal_id) backs the update. The cited signal\'s account_id and source URL are validated.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        cited_signal_id: { type: 'string', description: 'The signal_id returned from your cite_web_finding call that backs this update.' },
        confidence: { type: 'number', description: 'Must be >= 0.85 to apply.' },
        patch: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            employee_count: { type: 'number' },
            revenue_estimate: { type: 'number' },
          },
        },
      },
      required: ['account_id', 'cited_signal_id', 'confidence', 'patch'],
    },
  },
]

const BASE_TOOLS: Anthropic.Tool[] = [
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

// Final TOOLS list passed to Claude — base tools always, web research tools
// only when WEB_RESEARCH_ENABLED. Anthropic's server-side web_search is added
// via a separate mechanism (the Anthropic.Tool type doesn't include native
// server tools at this SDK version; they're appended in the message-create
// call below as a typed cast). Keeping this list to user-defined tools keeps
// the type safety clean.
const TOOLS: Anthropic.Tool[] = WEB_RESEARCH_ENABLED
  ? [...BASE_TOOLS, ...WEB_RESEARCH_TOOLS]
  : BASE_TOOLS

async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'get_account': return tool_get_account(input.account_id as string)
    case 'get_contacts': return tool_get_contacts(input.account_id as string)
    case 'get_signals': return tool_get_signals(input.account_id as string, input.limit as number | undefined)
    case 'get_account_actions': return tool_get_account_actions(input.account_id as string, input.days as number | undefined)
    case 'update_account_scores': return tool_update_account_scores(input.account_id as string, input.intent_score as number, input.engagement_score as number)
    case 'create_signal': return tool_create_signal(input.account_id as string, input.signal_type as string, input.source as string, input.content as string, input.sentiment as string)
    case 'fetch_url': return tool_fetch_url(input.url as string)
    case 'cite_web_finding': return tool_cite_web_finding(
      input.account_id as string,
      input.claim as string,
      input.source_url as string,
      input.exact_quote_from_source as string,
      input.category as string,
      input.confidence as number,
    )
    case 'update_account_firmographics': return tool_update_account_firmographics(
      input.account_id as string,
      input.cited_signal_id as string,
      input.confidence as number,
      input.patch as { description?: string; employee_count?: number; revenue_estimate?: number },
    )
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

    const stepList = WEB_RESEARCH_ENABLED
      ? `Steps:
1. Call get_account to understand what's already on file.
2. Call get_contacts and get_signals and get_account_actions to load the existing context.
3. Use web_search + fetch_url to find fresh public information that adds to or updates the picture: firmographic changes, regulatory events, news, executive moves, intent signals, named systems they use today.
4. For every web-sourced fact you want to keep, call cite_web_finding with claim + source_url + exact_quote_from_source + category + confidence. Anything that doesn't pass URL + quote validation is rejected — try a different source or omit the claim.
5. If a web finding's confidence >= 0.85 AND it's a firmographic update (description, employee_count, revenue_estimate), follow up with update_account_firmographics referencing the cited_signal_id you just got back. Otherwise leave it as a signal only.
6. Synthesize the picture — update scores if warranted, create_signal for engagement gaps you spotted in get_account_actions (these are agent-synthesized, not web-sourced — source = "AccountIntelligenceAgent").
7. Return a JSON intelligence summary.`
      : `Steps:
1. Call get_account to understand the account
2. Call get_contacts to understand the buying group
3. Call get_signals to review recent signals
4. Call get_account_actions to see recent touchpoints
5. Synthesize the intelligence — update scores if warranted, create a signal if you've inferred new context
6. Return a JSON intelligence summary`

    const webResearchBlock = WEB_RESEARCH_ENABLED ? `\n${WEB_RESEARCH_RULES}\n` : ''

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `You are the AccountIntelligenceAgent. Analyze account ${account_id} by calling the available tools.

${stepList}

${TULIP_VERIFIED_ROSTER}

${ACCOUNT_NAME_PRECISION}

${ZERO_FABRICATION_RULES}
${webResearchBlock}

SIGNAL CONTENT RULES (when you call create_signal) — CRITICAL:
The content field renders on the Signals tab. The UI splits it as: the first sentence = bold headline, subsequent short sentences = bullets. Write accordingly.

- Sentence 1 (the headline): one declarative fact, 10-22 words, ending in a period. No colons, no "CRITICAL" prefixes, no ALL CAPS.
- Sentences 2-4 (supporting bullets): each is a short standalone sentence, 8-20 words, period-terminated. Max 3 of them.
- Every bullet must be independently readable. Never write a fragment that relies on the prior sentence for grammar.
- NO embedded "-" or "•" or markdown in the content. The UI adds the bullet dots.
- For an ENGAGEMENT-GAP synthesis signal: name the specific gap (touchpoint count, contacts untouched, days of silence) grounded in get_account_actions + get_contacts output. Do not invent stakeholder quotes or strategic window framing that is not in the data.
- Numeric facts (injury counts, recall units, headcount, revenue) MUST be quoted from real signals. Round figures like "830+ injuries" are fabrication unless the data shows them — use the exact integer from the source.

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

    // When web research is enabled, append Anthropic's server-side web_search
    // tool to the request. The SDK type doesn't yet model the server-side
    // tool variant, so we cast through unknown — this is a documented usage
    // pattern. max_uses caps the agent at 8 web searches per run to bound
    // latency and token spend.
    const requestTools = WEB_RESEARCH_ENABLED
      ? ([
          ...TOOLS,
          { type: 'web_search_20250305', name: 'web_search', max_uses: 8 } as unknown as Anthropic.Tool,
        ])
      : TOOLS
    const requestMaxTokens = WEB_RESEARCH_ENABLED ? 4096 : 2048

    while (true) {
      const response = await createWithRetry(anthropic, {
        model: 'claude-opus-4-6',
        max_tokens: requestMaxTokens,
        tools: requestTools,
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
