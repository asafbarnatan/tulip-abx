import Anthropic from '@anthropic-ai/sdk'
import { createWithRetry } from './anthropic-retry'
import {
  tool_get_account,
  tool_get_contacts,
  tool_get_signals,
  tool_get_positioning_kernel,
  tool_get_proof_points,
  tool_save_positioning_brief,
  createAgentRun,
  appendAgentStep,
  completeAgentRun,
  failAgentRun,
} from './agent-tools'
import type { IndustryVertical, Geography } from '@/lib/database.types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_account',
    description: 'Fetch full account record.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
  },
  {
    name: 'get_contacts',
    description: 'Fetch buying group contacts with persona types and pain points.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
  },
  {
    name: 'get_signals',
    description: 'Fetch recent signals to incorporate into message relevance.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' }, limit: { type: 'number' } }, required: ['account_id'] },
  },
  {
    name: 'get_positioning_kernel',
    description: 'Get Tulip\'s positioning context for this account\'s vertical, geography, and maturity.',
    input_schema: {
      type: 'object',
      properties: {
        industry_vertical: { type: 'string' },
        geography: { type: 'string' },
        digital_maturity: { type: 'number' },
      },
      required: ['industry_vertical', 'geography', 'digital_maturity'],
    },
  },
  {
    name: 'get_proof_points',
    description: 'Get relevant proof points for the account\'s industry vertical.',
    input_schema: {
      type: 'object',
      properties: { industry_vertical: { type: 'string' }, count: { type: 'number' } },
      required: ['industry_vertical'],
    },
  },
  {
    name: 'save_positioning_brief',
    description: 'Save the generated positioning brief to the database.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        positioning_statement: {
          type: 'object',
          description: 'Structured April Dunford-style positioning statement. Each field completes the sentence.',
          properties: {
            for: { type: 'string', description: 'Target customer — who exactly. e.g. "pharma manufacturing leaders modernizing under compliance pressure"' },
            category: { type: 'string', description: 'The market category Tulip competes in for this account. e.g. "composable frontline operations platform"' },
            key_benefit: { type: 'string', description: 'The #1 outcome. e.g. "replaces paper batch records with auditable digital workflows in weeks, not years"' },
            unlike: { type: 'string', description: 'The main alternative being displaced. e.g. "traditional monolithic MES that require 18-24 month deployments"' },
            because: { type: 'string', description: 'The unique differentiator / why we can deliver. e.g. "process engineers own and adapt the apps directly — no IT bottleneck"' },
          },
          required: ['for', 'category', 'key_benefit', 'unlike', 'because'],
        },
        core_message: { type: 'string', description: 'Internal strategic narrative in the exact structured format "WHY NOW:\\n- bullet\\n- bullet\\n\\nTHE PLAY:\\n- bullet\\n- bullet". 2-4 complete sentences per section. See prompt for exact rules.' },
        persona_messages: { type: 'object' },
        proof_points: { type: 'array', items: { type: 'string' } },
        objection_handlers: { type: 'array', items: { type: 'object', properties: { objection: { type: 'string' }, response: { type: 'string' } } } },
        recommended_tone: { type: 'string', enum: ['consultative', 'challenger', 'empathetic', 'technical', 'executive'] },
        key_themes: { type: 'array', items: { type: 'string' } },
      },
      required: ['account_id', 'positioning_statement', 'core_message', 'persona_messages', 'proof_points', 'objection_handlers', 'recommended_tone', 'key_themes'],
    },
  },
]

async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'get_account': return tool_get_account(input.account_id as string)
    case 'get_contacts': return tool_get_contacts(input.account_id as string)
    case 'get_signals': return tool_get_signals(input.account_id as string, input.limit as number | undefined)
    case 'get_positioning_kernel': return tool_get_positioning_kernel(input.industry_vertical as IndustryVertical, input.geography as Geography, input.digital_maturity as number)
    case 'get_proof_points': return tool_get_proof_points(input.industry_vertical as IndustryVertical, input.count as number | undefined)
    case 'save_positioning_brief': return tool_save_positioning_brief(
      input.account_id as string,
      input.core_message as string,
      input.persona_messages as Record<string, string>,
      input.proof_points as string[],
      input.objection_handlers as Array<{ objection: string; response: string }>,
      input.recommended_tone as string,
      input.key_themes as string[],
      input.positioning_statement as { for: string; category: string; key_benefit: string; unlike: string; because: string } | null
    )
    default: throw new Error(`Unknown tool: ${name}`)
  }
}

export async function runPositioningAgent(
  account_id: string,
  onStep: (step: object) => void,
  intelligence_summary?: string,
  trigger_source = 'manual'
): Promise<{ run_id: string; output_summary: string }> {
  const run = await createAgentRun('PositioningAgent', account_id, `Generating positioning brief for ${account_id}`, trigger_source)
  const started_at = run.started_at

  const emitStep = async (step: string, message: string, tool_call?: string) => {
    const s = { ts: new Date().toISOString(), agent: 'PositioningAgent', step, message, tool_call }
    onStep(s)
    await appendAgentStep(run.id, s)
  }

  try {
    await emitStep('initializing', 'Starting positioning brief generation with Claude Opus 4.6...')

    const contextNote = intelligence_summary
      ? `\n\nACCOUNT INTELLIGENCE CONTEXT (from previous agent):\n${intelligence_summary}`
      : ''

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `You are the PositioningAgent. Generate an AI-powered positioning brief for account ${account_id}.

Steps:
1. get_account — understand the account
2. get_contacts — understand the buying group
3. get_signals — incorporate recent signals
4. get_positioning_kernel — load Tulip's positioning framework for this account's context
5. get_proof_points — load relevant proof points
6. save_positioning_brief — save the generated brief${contextNote}

═══════════════════════════════════════════════════════════════════════════════
TULIP POSITIONING — CORE PHILOSOPHY (non-negotiable, applies to every field)
═══════════════════════════════════════════════════════════════════════════════
Tulip IS the MES. It is not additive to MES. It is not a layer on top of MES.
It is the MES — just composable, plant-by-plant, built by production engineers
themselves. The differentiation against competitors is composability vs. the
monolithic rigidity of traditional MES vendors (Rockwell Plex, Siemens Opcenter,
Dassault, SAP MII, etc.). When framing Tulip:

- CORRECT framing: "a composable MES", "a kaizen-rate production platform",
  "a GxP-ready frontline platform", "plant-by-plant composable MES".
- CORRECT contrast: "unlike monolithic MES deployments that lock every plant
  into one global configuration" / "unlike 18-month rigid MES rollouts" /
  "unlike traditional MES vendors that force a single global schema".
- CORRECT "why composable" framing: "production engineers build their own apps
  from a shared library", "each plant composes the apps that fit its process",
  "citizen development at kaizen speed", "no central IT queue, no vendor-led
  implementation cycle".

FORBIDDEN framings (Nathan Linder will reject the brief if these appear):
- "Tulip layers on top of existing MES" / "Layer, don't replace" — this frames
  Tulip as additive. Tulip IS the MES.
- "Tulip sits above your MES/ERP" / "fills the gap above MES" — same issue.
- "Tulip complements MES by adding frontline" — same issue.
- Any pillar named "Layer, don't replace" or similar.
- Any objection response like "Tulip doesn't replace your MES, it sits on top
  of it." Instead, the response should be: "Tulip IS the MES — just composable.
  Unlike rigid MES deployments, each plant builds its own apps on the shared
  Tulip platform. Your existing ERP and upstream systems stay; the rigid MES
  vendor gets replaced by a platform the production engineers actually own."

═══════════════════════════════════════════════════════════════════════════════
REAL TULIP AI FEATURES YOU CAN CITE (only when they map to an actual pain)
═══════════════════════════════════════════════════════════════════════════════
Building with AI (for the builder / engineer):
- AI Composer: turns documents or videos into app structures and screens.
- AI App Translation: automatically translates app text for global deployment
  (perfect answer to "how do we scale across N plants in M languages").
- AI Trigger Descriptions: converts trigger logic into plain-English summaries.
- AI Insights (chat with tables): generates analytics, charts, dashboards from
  production data via natural-language commands.

Augmenting Production with AI (for the operator / shop floor):
- Tulip MCP: secure context bridge between Tulip data and external AI assistants.
- Frontline Copilot AI Chat: lets operators ask natural-language questions
  grounded in manuals and workflow context.
- OCR: extracts text and data from paper documents or images, digitizing legacy
  workflows without manual re-entry.
- AI Prompt Actions: embeds AI into workflow steps (extract, summarize, analyze).

Agentic AI:
- Agent Marketplace / Library: pre-built agents downloadable for faster time to
  value.
- Example agent: Shift Summary Reporter — summarizes production data to support
  shift handoffs.
- Full Page Chat + Automations / Headless Agents: background agents triggered
  by events, running without human interaction.

Framing shortcuts:
- Building with AI = helps the builder work faster.
- Augmenting Production with AI = helps the operator/shop floor work smarter.
- Predictive AI = predicts · Generative AI = explains · Agentic AI = acts.

USE these features by NAME when they answer an objection or strengthen a proof
point. Do NOT mention AI vaguely ("we have AI features"). Name the specific
capability and tie it to the account's specific pain.

═══════════════════════════════════════════════════════════════════════════════
WRITING RULES (apply to every field)
═══════════════════════════════════════════════════════════════════════════════
- SENTENCE CASE only. The positioning_statement values must start with a lowercase letter (unless proper noun like "Bayer" or "FDA"). They are clause fragments that concatenate into one sentence, not standalone titles.
- Every word earns its place. No filler. No "solutions", "unlock", "leverage", "empower", "transform", "seamless", "robust", "comprehensive".
- Specific to THIS account. Generic language is a failure.

BANNED RECYCLED PHRASES (you used these in prior briefs — they reveal the template):
- "composable frontline operations platform" — use "composable MES" or
  "kaizen-rate production platform" or a vertical-specific variant (pharma →
  "GxP-ready composable MES"; aerospace → "AS9100-ready composable MES").
- "layers above existing MES/ERP without rip-and-replace" — FORBIDDEN.
  Tulip IS the MES. See CORE PHILOSOPHY above.
- "live in weeks, not years" / "in weeks, not years" — use concrete units: "on one production line before Q3 closes", "before the next FDA inspection cycle", "before Axonics integration closes", "before the DoD contract ramp hits full scale". Anchor to a real event at this account.
- "no IT bottleneck, no vendor lock-in" — say it once per brief at most, and only if the account's IT Director or Technical Evaluator has actually raised this concern in the signals or contacts data.
- "IT governs, operations builds" — same rule; use only when it maps to an actual contact's persona_type (Technical Evaluator / Blocker).
- "Greenfield beachhead" as a pillar title — too product-pitch, not composable.
  A greenfield pilot is fine as TACTICS but not as a strategic PILLAR.

PROOF POINT SPECIFICITY:
- NEVER write "[CUSTOMER NAME REQUIRED]" in a proof point. It's ugly in the UI.
  Instead, use generic-but-professional framing: "A Fortune 500 discrete
  manufacturer…", "A leading industrial equipment OEM…", "A global pharma
  manufacturer…". Or cite real Tulip partnerships/customers from the verified
  list below.
- Every proof point must include a specific number with a specific unit
  (e.g. "95% first-time yield", "34% MoM growth", "€200M modernization budget",
  "18-month reduction in deployment time") OR a named real Tulip capability
  (e.g. "Factory Playback", "AI App Translation", "Tulip MCP") tied to the
  account's specific pain.
- The words "significantly", "dramatically", "materially", "substantially", "meaningfully" are BANNED in proof points.
- Proof points must reference THIS account's specific pain. Bayer's proof points differ from RTX's. Reusing a generic "manufacturer deployed Tulip" proof is a failure.

CUSTOMER NAMING — HARD RULE (DO NOT VIOLATE):

You may name a company as a Tulip customer or partner ONLY if the name appears
in one of these three sources:

  1. The VERIFIED PUBLIC ROSTER below (hand-curated from tulip.co case studies,
     tulip.co press, and verified partner announcements as of 2026-04-24).
  2. Output of a tool call that returned Tulip-provided internal data
     (Salesforce, an internal file, or a Tulip employee statement reached via
     the provided tools).
  3. The account record itself already describes Tulip as an incumbent (via
     positioning_kernel, signals, or account_actions notes) AND that record's
     source is explicit.

If the name you want to use is NOT in one of those three sources, DO NOT NAME
IT. Fall back to anonymized industry-qualified phrasing: "A Fortune 500 [X]
manufacturer…", "A Tulip pharmaceutical customer…", "A J&J MedTech division…"
(when you know J&J is on the roster but don't know which division specifically).

Treat this rule the same way you treat compliance claims — if you cannot cite
a source, you cannot make the claim. Inventing "Customer X at Site Y achieved
Z in N weeks" when you have no verification is a credibility failure that
Nathan Linder (Tulip CEO) will catch the instant he reads the brief.

VERIFIED PUBLIC TULIP ROSTER (safe to name):

  Customers (named on tulip.co/case-studies or tulip.co public pages):
    - J&J / Johnson & Johnson (industry: medical device — do NOT invent a
      specific division like "DePuy Synthes" unless the source confirms it;
      prefer "A J&J MedTech division")
    - DMG MORI (machine tools)
    - Stanley Black & Decker (power tools, diversified manufacturing)
    - Formlabs (3D printing)
    - Terex (heavy equipment)
    - Delta Faucet (consumer)
    - Outset Medical (medical device)
    - Tiffany & Co. (luxury goods)
    - Laerdal (medical)
    - Piaggio Fast Forward (mobility)
    - Sharp Packaging (clinical packaging)
    - Mack Molding (plastics)
    - TICO Tractors (agricultural equipment)
    - RFK Racing (motorsports)
    - Pratt Miller Engineering (U.S. defense engineering and low-volume
      aerospace — THE named-customer proof for aerospace/defense briefs)
    - VEKA, Innovafeed, Zaleco, Reframe Systems, Test Devices by Schenck

  Partnerships / Strategic alliances (publicly announced):
    - Mitsubishi Electric — strategic alliance + $120M Series D investment
      announced Dec 2025. Tulip now has a Tokyo office. Fully public.

  Capabilities / certifications (publicly announced):
    - FedRAMP Moderate Equivalency (covers CUI-scope DoD programs)
    - Composable MES for Aerospace and Defense (official Tulip product)
    - AI features: AI Composer, AI App Translation, AI Trigger Descriptions,
      AI Insights, Tulip MCP, Frontline Copilot, Factory Playback, OCR,
      AI Prompt Actions

  Anonymized Tulip case studies you MAY cite (with real metrics):
    - "A Tulip pharmaceutical customer reduced equipment changeover time by
       78%" — from tulip.co/case-studies/pharmaceutical-case-study/
    - "A Tulip medical device customer built 90+ guided-assembly apps and a
       fully paperless digital DHR system in a greenfield facility,
       completing new-product introduction in 6 months" — from
       tulip.co/case-studies/medical-device-case-study/

NAMES THAT ARE NOT ON TULIP'S ROSTER — do NOT cite as customers:
    Moderna, Takeda, Merck (US or KGaA), Pfizer, AstraZeneca, Sanofi, Novartis,
    GSK, Amgen, Lonza, Bayer, Thermo Fisher, Boston Scientific, RTX, Pratt &
    Whitney, Collins Aerospace, Raytheon, Dentsply Sirona, Ethicon.
    (Several of these appear as TARGET accounts in this platform — never
    describe them as existing Tulip customers.)

OBJECTION HANDLER RULES:
- The "We already have MES and ERP — why add another platform?" objection
  SHOULD be included, BUT the response must reframe Tulip as THE MES (composable)
  — NEVER as a layer above MES. Correct response pattern:
  "Tulip IS the MES — just composable. The rigid vendor MES you're comparing us
  to locks every plant into one global configuration; Tulip lets each plant
  compose its own apps on a shared platform, at kaizen speed. Your ERP stays;
  the rigid MES is what Tulip replaces."
- Prefer objections that let you name specific Tulip AI features:
  - "Global scale across N plants is a multi-year program" → answer with
    AI App Translation (automatic localization removes the biggest rollout
    friction point).
  - "Operators won't adopt yet another screen" → answer with Frontline
    Copilot AI Chat (operators ask natural-language questions grounded in
    the workflow).
  - "Our paper SOP library is huge" → answer with OCR (digitizes legacy
    paper workflows without manual re-entry).

PERSONA MESSAGES — DO NOT INVENT CONTACTS:
- Generate persona_messages ONLY for contacts returned by get_contacts. Do NOT add placeholder or unmapped personas like "(VP Manufacturing — to be identified)". If a role doesn't exist in the contacts data, it does not get a persona message.
- NEVER open a persona message with the contact's first name followed by a comma (e.g., "Claudia, your team..."). That reads as cold-email spam. Open with the insight itself: "Every paper batch record is a deviation waiting to happen — and Wuppertal's shift-to-shift inconsistency makes it worse."
- Use 2nd person ("you") in persona_messages — they ARE customer-facing. This is the opposite of core_message's voice rule.

- NEVER invent names for Tulip personnel. Refer to the Tulip side abstractly: "the AE", "Tulip's coverage team", "the EMEA pharma AE". The assigned_ae field contains a ROLE (e.g. "EMEA Pharma AE"), not a person's name.
- DO use the real names of buying-group contacts (they come from the get_contacts tool — those are the actual people at the prospect account).

THE POSITIONING STATEMENT (the scannable summary the CEO sees first):
Generate a structured April Dunford-style positioning statement. When concatenated it reads as ONE sentence:
"For [for], Tulip is [category] that [key_benefit], unlike [unlike], because [because]."

Example for Bayer AG (note the lowercase starts, and the category positions
Tulip AS the MES — composable — not as a layer above MES):
- for: "pharma manufacturing leaders modernizing under compliance pressure"
- category: "a GxP-ready composable MES"
- key_benefit: "replaces paper batch records with auditable digital workflows validated on one line, then composed across every site"
- unlike: "monolithic MES deployments that lock every plant into one global configuration and take 18-24 months per site"
- because: "process engineers build and adapt the apps themselves at kaizen speed, plant by plant, on a shared Tulip platform"

Each field: 8-20 words. Punchy, scannable.

THE CORE MESSAGE — INTERNAL STRATEGIC NARRATIVE (read by the AE, NEVER sent to the customer):

MANDATORY STRUCTURED FORMAT — the UI parses this literally. If you write prose, the CEO sees broken fragments. Use this exact format, nothing else:

WHY NOW:
- <one complete sentence, standalone and readable on its own>
- <one complete sentence, standalone and readable on its own>
- <one complete sentence, standalone and readable on its own>

THE PLAY:
- <one complete sentence, standalone and readable on its own>
- <one complete sentence, standalone and readable on its own>
- <one complete sentence, standalone and readable on its own>

Format rules (every one is enforced):
- Exactly two sections, labeled "WHY NOW:" and "THE PLAY:" (uppercase, trailing colon).
- 3 bullets per section. Minimum 2, maximum 4. Every bullet starts with "- " (hyphen + space) at column 0.
- Each bullet is a COMPLETE, GRAMMATICALLY COHERENT SENTENCE that stands alone. Never a fragment, never a sub-clause. If you can't read the bullet out loud without reaching for the bullet before it, it's wrong.
- Bullets end in a period. No em-dashes stranded at the end. No trailing commas.
- Total length per bullet: 12 to 30 words. Terse, specific, concrete.
- NO "you" or "your" in these bullets — this is an internal AE briefing, not customer copy.
- NEVER invent Tulip-side names. Refer to the Tulip side as "the AE" or "Tulip's coverage team".
- DO include real buying-group contact names pulled from get_contacts (e.g., Claudia Becker).
- Every fact (budget, contract value, deal stage, competitor, specific regulation) must be quotable from get_account, get_contacts, get_signals, or the ACCOUNT INTELLIGENCE CONTEXT above. Do not invent sources like "6sense intent spike" or "Bombora research" unless those terms appear in the signals.

Correct example for Bayer AG:
WHY NOW:
- Bayer's Wuppertal site still runs paper batch records ahead of the next EMA inspection cycle.
- Signals show a multi-week surge in intent on electronic batch records and MES modernization.
- Zero outbound touchpoints in the last 30 days despite an active pipeline stage.

THE PLAY:
- The AE opens a dual thread to Claudia Becker (Quality Assurance Lead) and the site's Head of IT.
- Position a paperless batch-record pilot on one Wuppertal fill-finish line before Q3 close.
- Use the pilot's audit trail as the proof point to sequence a Berlin and Leverkusen rollout.

Incorrect (do NOT emit anything like this):
"Bayer's €200M modernization budget and 21-day intent spike create a narrow window — then expand EU-wide as the site unlock sequences."
(one sentence split on em-dashes reads as broken fragments in the UI)

THE KEY THEMES (3 strategic pillars — must have titles AND descriptions):
Each theme is ONE string formatted as: "Pillar Title — One sentence (max 18 words) explaining what this pillar means in the AE's conversation with this account."

Example for Bayer (Nathan-aligned — composability first, Tulip IS the MES):
- "Production engineers build, not wait — Bayer's process engineers compose paperless batch records themselves from pre-built Tulip blocks (IoT, SPC, GxP workflows), with no central IT queue or 18-month vendor project."
- "Composable GxP-ready MES — Tulip is the MES, but unlike monolithic deployments that freeze every plant into one configuration, Bayer's five sites compose their own apps plant by plant on the shared Tulip platform."
- "Validated once, translated everywhere — AI App Translation makes the Wuppertal pilot instantly usable at Bergkamen, Leverkusen, Berlin, and Weimar without a separate localization project per site."

Use " — " (space, em-dash, space) as the separator. UI parses on this.

The entire brief must be deeply adapted to this specific account — vertical, geography, digital maturity, buying group. Not generic.`,
      },
    ]

    let savedBriefId = ''

    while (true) {
      const response = await createWithRetry(anthropic, {
        model: 'claude-opus-4-6',
        max_tokens: 3000,
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
            if (block.name === 'save_positioning_brief' && result && typeof result === 'object' && 'id' in result) {
              savedBriefId = (result as { id: string }).id
              await emitStep('brief_saved', `Positioning brief saved (ID: ${savedBriefId})`)
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

    // Silent-save guard. If Opus ended its turn without calling save_positioning_brief
    // (e.g. burned tokens on reasoning, hit a content-policy refusal, returned only
    // prose), the run would otherwise be marked "completed" with nothing in the DB and
    // the UI would render a stale/empty brief. Fail loudly instead.
    if (!savedBriefId) {
      const err = 'PositioningAgent ended without calling save_positioning_brief — no brief was saved.'
      await emitStep('error', err)
      await failAgentRun(run.id, err, started_at)
      throw new Error(err)
    }

    const output = `Positioning brief generated and saved (ID: ${savedBriefId})`
    await emitStep('complete', 'Positioning brief generation complete')
    await completeAgentRun(run.id, output, started_at)
    return { run_id: run.id, output_summary: output }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await emitStep('error', `Agent failed: ${msg}`)
    await failAgentRun(run.id, msg, started_at)
    throw err
  }
}
