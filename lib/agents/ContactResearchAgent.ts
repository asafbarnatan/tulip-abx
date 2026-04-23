import Anthropic from '@anthropic-ai/sdk'
import {
  tool_get_account,
  createAgentRun,
  appendAgentStep,
  completeAgentRun,
  failAgentRun,
} from './agent-tools'
import { createWithRetry } from './anthropic-retry'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ContactCandidate {
  name: string
  title: string
  persona_type: 'Champion' | 'Economic Buyer' | 'Technical Evaluator' | 'End User' | 'Blocker'
  source_url: string
  confidence: 'high' | 'medium' | 'low'
  inferred_pain_points: string[]
  evidence_quote: string
  reasoning: string
}

// Mixed client-side tools + Anthropic's server-side web_search
// The SDK type doesn't include server tools yet, so we use `unknown` cast for the array.
const TOOLS = [
  {
    name: 'get_account',
    description: 'Fetch the account record (company name, industry, HQ, sites).',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
  },
  {
    // Claude's server-side web search tool — Anthropic executes this and injects results
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: 6,
  },
  {
    name: 'propose_contact',
    description: 'Propose a real, verifiable candidate contact found from public sources. Only call after web_search has produced a verifiable source with a direct URL. Do NOT invent names or titles. If no verifiable person found, do not call this tool — instead, return a final text message explaining why.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full name as publicly stated' },
        title: { type: 'string', description: 'Exact current title from the source' },
        persona_type: { type: 'string', enum: ['Champion', 'Economic Buyer', 'Technical Evaluator', 'End User', 'Blocker'] },
        source_url: { type: 'string', description: 'Direct URL to the press release, leadership page, or public profile that evidences this person\'s role' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        inferred_pain_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'Pain points inferred ONLY from their public statements or the scope of their role as stated on the source page. Do not invent pain.',
        },
        evidence_quote: { type: 'string', description: 'A direct quote from the source page proving their role and scope' },
        reasoning: { type: 'string', description: '1-2 sentences on why this person fits the requested role for the account' },
      },
      required: ['name', 'title', 'persona_type', 'source_url', 'confidence', 'inferred_pain_points', 'evidence_quote', 'reasoning'],
    },
  },
] as unknown as Anthropic.Tool[]

async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'get_account': return tool_get_account(input.account_id as string)
    case 'web_search': return null // server-side tool, handled by Anthropic
    case 'propose_contact': return { accepted: true, candidate: input }
    default: throw new Error(`Unknown tool: ${name}`)
  }
}

export async function runContactResearchAgent(
  account_id: string,
  target_role: string,   // e.g., "Head of Manufacturing" or "IT/OT Director" or "Plant Manager"
  target_persona_type: string,  // 'Champion' | 'Economic Buyer' | ...
  onStep: (step: object) => void,
  trigger_source = 'manual'
): Promise<{ run_id: string; candidates: ContactCandidate[]; summary: string }> {
  const run = await createAgentRun(
    'ContactResearchAgent',
    account_id,
    `Researching real ${target_persona_type} (${target_role}) at account ${account_id}`,
    trigger_source
  )
  const started_at = run.started_at

  const emitStep = async (step: string, message: string, tool_call?: string) => {
    const s = { ts: new Date().toISOString(), agent: 'ContactResearchAgent', step, message, tool_call }
    onStep(s)
    await appendAgentStep(run.id, s)
  }

  try {
    await emitStep('initializing', `Searching public sources for a real ${target_persona_type} (${target_role}) at the account...`)

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `You are the ContactResearchAgent. Your job is to find ONE real, publicly-verifiable executive at the account who fills a specific buying-group role. You have web search access.

Steps:
1. Call get_account with account_id="${account_id}" to see the company name, HQ, industry, sites.
2. Use web_search to find a real named executive whose current title matches the target role. Good sources (in priority order):
   - The company's official leadership / board / investor-relations pages
   - Recent press releases (prefer last 18 months)
   - Major business publications (Fortune, Fierce Pharma, BusinessWire, MedTech Dive, etc.)
   - LinkedIn public profiles (only if corroborated by official company source)
3. Once you have 1-2 candidates with strong public sourcing, call propose_contact for the best match.

HARD RULES — violating any of these is a failure:
- NEVER invent a name, title, or LinkedIn URL. Only propose people you verified from a real public source.
- The source_url must be a real URL that shows this person's title. Not a homepage. A specific leadership bio or press release.
- Inferred pain points must cite the scope of the person's role as described on the source page. Do NOT invent pain.
- If you cannot find a publicly-verifiable person for this role at this company, DO NOT propose anyone. Return your reasoning in a final text response.
- Include ONE evidence_quote — a direct pull from the source page that proves the role.

TARGET ROLE: ${target_role}
TARGET PERSONA TYPE: ${target_persona_type}

Begin now.`,
      },
    ]

    const candidates: ContactCandidate[] = []
    let finalSummary = ''
    let iterations = 0
    const MAX_ITERATIONS = 6

    while (iterations < MAX_ITERATIONS) {
      iterations++

      const response = await createWithRetry(anthropic, {
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        tools: TOOLS,
        messages,
      })

      // Capture final text if any
      for (const block of response.content) {
        if (block.type === 'text' && block.text.trim()) {
          finalSummary = block.text.trim()
        }
      }

      if (response.stop_reason === 'end_turn') break
      if (response.stop_reason !== 'tool_use') break

      // Surface server-side web_search activity to the UI
      for (const block of response.content) {
        const anyBlock = block as unknown as { type: string; name?: string; input?: unknown }
        if (anyBlock.type === 'server_tool_use' && anyBlock.name === 'web_search') {
          const q = (anyBlock.input as { query?: string })?.query ?? ''
          await emitStep('web_search', `Searching: "${q}"`, 'web_search')
        }
        if (anyBlock.type === 'web_search_tool_result') {
          await emitStep('search_results', 'Search results returned', 'web_search')
        }
      }

      // Execute client-side tool uses only (web_search is server-side and already resolved)
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const name = block.name
          if (name === 'propose_contact') {
            const cand = block.input as unknown as ContactCandidate
            await emitStep('candidate_proposed', `Found candidate: ${cand.name} (${cand.title})`, 'propose_contact')
            candidates.push(cand)
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ accepted: true }) })
          } else {
            await emitStep('tool_call', `Calling ${name}...`, name)
            try {
              const result = await executeTool(name, block.input as Record<string, unknown>)
              await emitStep('tool_result', `${name} completed`)
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${msg}`, is_error: true })
            }
          }
        }
      }

      messages.push({ role: 'assistant', content: response.content })
      // If there are no client-side tool_uses this turn, the model is only using server tools
      // and the conversation continues naturally on the next iteration — no user message needed.
      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults })
      } else {
        // No client-side tool uses — break to prevent infinite loop on server-tool-only turns
        break
      }
    }

    const summary = candidates.length > 0
      ? `Found ${candidates.length} real candidate${candidates.length > 1 ? 's' : ''} for ${target_role}. Review and approve to add to buying group.`
      : `No publicly-verifiable candidate found for ${target_role}. ${finalSummary || 'Consider integrating ZoomInfo / Salesforce or adding manually.'}`

    await emitStep('complete', summary)
    await completeAgentRun(run.id, summary, started_at)

    return { run_id: run.id, candidates, summary }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await emitStep('error', `Agent failed: ${msg}`)
    await failAgentRun(run.id, msg, started_at)
    throw err
  }
}
