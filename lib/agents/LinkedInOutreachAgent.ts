import Anthropic from '@anthropic-ai/sdk'
import { createWithRetry } from './anthropic-retry'
import {
  tool_get_account,
  tool_get_contacts,
  tool_get_positioning_brief,
  tool_save_linkedin_campaign_draft,
  createAgentRun,
  appendAgentStep,
  completeAgentRun,
  failAgentRun,
} from './agent-tools'
import { getSupabase } from '@/lib/supabase'
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
    description: 'Fetch buying group for InMail personalization.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
  },
  {
    name: 'get_positioning_brief',
    description: 'Get the latest positioning brief to anchor ad copy in approved messaging.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
  },
  {
    name: 'save_linkedin_campaign',
    description: 'Save a LinkedIn Sponsored Content campaign draft. The campaign is created as DRAFT — never auto-activates.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        campaign_name: { type: 'string' },
        headline: { type: 'string', description: 'Max 100 chars — ONE observation + ONE solution hook. Names the account specifically. No snark, no shaming. See system prompt for DO/DONT examples.' },
        ad_copy: { type: 'string', description: 'Max 600 chars — 3 short paragraphs max. Specific account facts in para 1, Tulip positioning in para 2, sequencing/proof in para 3.' },
        target_companies: { type: 'array', items: { type: 'string' }, description: 'Company domains to target' },
      },
      required: ['account_id', 'campaign_name', 'headline', 'ad_copy', 'target_companies'],
    },
  },
]

async function executeTool(name: string, input: Record<string, unknown>, run_id: string) {
  switch (name) {
    case 'get_account': return tool_get_account(input.account_id as string)
    case 'get_contacts': return tool_get_contacts(input.account_id as string)
    case 'get_positioning_brief': return tool_get_positioning_brief(input.account_id as string)
    case 'save_linkedin_campaign': {
      // Check for real LinkedIn credentials
      const { data: settings } = await getSupabase().from('app_settings').select('linkedin_access_token, linkedin_org_id').single()
      const hasLinkedIn = settings?.linkedin_access_token && settings?.linkedin_org_id

      if (hasLinkedIn) {
        // Try real LinkedIn Marketing API
        try {
          const campaignResult = await createLinkedInCampaign(
            settings.linkedin_access_token!,
            settings.linkedin_org_id!,
            input.campaign_name as string,
            input.headline as string,
            input.ad_copy as string,
          )
          // Save with real campaign ID
          return await getSupabase()
            .from('linkedin_campaigns')
            .insert({
              account_id: input.account_id,
              linkedin_campaign_id: campaignResult.id,
              campaign_name: input.campaign_name,
              headline: input.headline,
              ad_copy: input.ad_copy,
              target_companies: input.target_companies,
              status: 'draft',
              agent_run_id: run_id,
            })
            .select()
            .single()
            .then(r => r.data)
        } catch {
          // Fall through to local save
        }
      }

      return tool_save_linkedin_campaign_draft(
        input.account_id as string,
        input.campaign_name as string,
        input.headline as string,
        input.ad_copy as string,
        input.target_companies as string[],
        run_id
      )
    }
    default: throw new Error(`Unknown tool: ${name}`)
  }
}

async function createLinkedInCampaign(
  access_token: string,
  org_id: string,
  name: string,
  _headline: string,
  _body: string
): Promise<{ id: string }> {
  const response = await fetch('https://api.linkedin.com/v2/adCampaignsV2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      account: `urn:li:sponsoredAccount:${org_id}`,
      name,
      objectiveType: 'WEBSITE_VISITS',
      status: 'DRAFT',
      type: 'SPONSORED_UPDATES',
      costType: 'CPM',
      dailyBudget: { amount: '50', currencyCode: 'USD' },
      unitCost: { amount: '10', currencyCode: 'USD' },
      locale: { country: 'US', language: 'en' },
    }),
  })
  if (!response.ok) throw new Error(`LinkedIn API error: ${response.status}`)
  const data = await response.json()
  return { id: data.id ?? data['id'] ?? 'unknown' }
}

export async function runLinkedInOutreachAgent(
  account_id: string,
  onStep: (step: object) => void,
  trigger_source = 'manual'
): Promise<{ run_id: string; output_summary: string }> {
  const run = await createAgentRun('LinkedInOutreachAgent', account_id, `Creating LinkedIn campaign for ${account_id}`, trigger_source)
  const started_at = run.started_at

  const emitStep = async (step: string, message: string, tool_call?: string) => {
    const s = { ts: new Date().toISOString(), agent: 'LinkedInOutreachAgent', step, message, tool_call }
    onStep(s)
    await appendAgentStep(run.id, s)
  }

  try {
    await emitStep('initializing', 'Starting LinkedIn outreach generation...')

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `You are the LinkedInOutreachAgent. Create a LinkedIn Sponsored Content campaign for account ${account_id}.

Steps:
1. get_account — understand the account
2. get_contacts — identify the buying group persona you're writing the ad for
3. get_positioning_brief — READ the positioning_statement and key_themes. Your ad copy MUST anchor in the brief's category phrase and strategic pillars, not in generic SaaS language.
4. save_linkedin_campaign — create the campaign draft

${TULIP_CORE_PHILOSOPHY}

${TULIP_VERIFIED_ROSTER}

${TULIP_AI_FEATURES}

${TULIP_BANNED_PHRASES}

${ACCOUNT_NAME_PRECISION}

${ZERO_FABRICATION_RULES}

WRITING RULES for headline + ad_copy (the ad is CUSTOMER-FACING — 2nd person):

────────────────── HEADLINE (max 100 chars) ──────────────────

STRUCTURE: [Named observation about this account] + [Tulip solution hook].

TONE: OBSERVATIONAL, not judgmental. State facts, offer a path. Never shame the prospect.

LENGTH: target 80-100 chars. Too long is a fail; too vague is a fail.

REQUIRED: include the account name AND a specific insider fact (plant name, drug program, regulatory deadline, M&A move, product launch). The fact MUST come from the data sources listed in ZERO FABRICATION above.

DO EXAMPLES (copy this pattern):
✓ "Bayer's five pharma sites still run paper batch records. Here's the 90-day digitization playbook." (97 chars — names account, specific fact, solution path)
✓ "Daikin's Fusion 25 plan needs kaizen-rate deployment across 3 continents." (75 chars — names strategic plan, specific solution)
✓ "RTX Collins' Columbus forging expansion needs AS9100 audit-ready work instructions by Q3." (91 chars — names subsidiary, project, regulatory deadline)

DONT EXAMPLES (never do this):
✗ "Solida-1's GMP deadline is fixed. Bayer's five sites still run paper batch records. That math doesn't work." (judgmental snark — never shame the prospect)
✗ "Transform your manufacturing with digital work instructions" (banned word + generic)
✗ "Unlock the power of modern MES" (banned word + generic)
✗ "Why Bayer is behind on digitization" (negative framing — never punch down at the account)

BANNED HEADLINE PATTERNS (automatic fail — revise):
- "that math doesn't work", "math isn't mathing", or any "X doesn't work" snark
- "Why [Account] is behind / failing / losing"
- "You need X" — use "X path" / "X playbook" / "here's how" instead
- Rhetorical "Will your X pass?" / "Can your X handle?" (anxiety-bait flops in enterprise)

────────────────── AD COPY (max 600 chars) ──────────────────

STRUCTURE: 3 short paragraphs (one blank line between).

Paragraph 1 — NAMED FACTS (2-3 sentences): The account's real specifics — plant names, product programs, regulatory triggers, recent investments, key personnel. The more insider-specific, the better. Every fact must be quotable from the tool-call data (see ZERO FABRICATION above).

Paragraph 2 — TULIP POSITIONING (1-2 sentences): Anchor in the positioning brief's category phrase. Tulip IS the composable MES (see CORE PHILOSOPHY) — never frame Tulip as a layer above MES. State the specific technical fit for this vertical. Frame the integration story as "your ERP and upstream systems stay; the rigid MES vendor is what Tulip replaces."

Paragraph 3 — SEQUENCING / PROOF (1 sentence): Name the validation path ("validated on one line first, then composed across the rest") OR a verified proof point from the roster (e.g. "a Tulip pharmaceutical customer cut equipment changeover by 78%"). Never invent a proof point.

NAME the specific vertical context (ALCOA+ for pharma, AS9100 for aerospace, kaizen for Japan/discrete, DHR for med device). A generic manufacturing ad is a failure.

SECOND PERSON ("your batch records", "your assembly line") is correct — the ad IS outreach.

────────────────── OUTPUT FIELDS ──────────────────

- campaign_name: "TulipABX — [Account Name] — [Month Year]"
- headline: as above, max 100 chars
- ad_copy: as above, max 600 chars
- target_companies: [account domain]

If no positioning brief exists, still generate compelling ad copy from account.description + signals — but use the same writing rules above.
The campaign is always created as DRAFT — never activated automatically.`,
      },
    ]

    let campaignSaved = false

    while (true) {
      const response = await createWithRetry(anthropic, {
        model: 'claude-opus-4-6',
        max_tokens: 2000,
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
            const result = await executeTool(block.name, block.input as Record<string, unknown>, run.id)
            if (block.name === 'save_linkedin_campaign') {
              campaignSaved = true
              await emitStep('campaign_saved', 'LinkedIn campaign draft saved')
            } else {
              await emitStep('tool_result', `${block.name} completed`)
            }
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

    // Silent-save guard — same pattern as PositioningAgent. If Opus end_turns
    // without calling save_linkedin_campaign, the LinkedIn panel would show no
    // new card and the run would still be marked "completed". Fail loudly instead.
    if (!campaignSaved) {
      const err = 'LinkedInOutreachAgent ended without calling save_linkedin_campaign — no campaign draft was saved.'
      await emitStep('error', err)
      await failAgentRun(run.id, err, started_at)
      throw new Error(err)
    }

    const output = 'LinkedIn campaign draft created and saved'
    await emitStep('complete', output)
    await completeAgentRun(run.id, output, started_at)
    return { run_id: run.id, output_summary: output }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await emitStep('error', `Agent failed: ${msg}`)
    await failAgentRun(run.id, msg, started_at)
    throw err
  }
}
