import Anthropic from '@anthropic-ai/sdk'
import {
  SYSTEM_PROMPT_BASE,
  VERTICAL_CONTEXT,
  GEOGRAPHY_CONTEXT,
  MATURITY_CONTEXT,
} from './positioning-kernel'
import { getProofPointsForAccount } from './proof-points'
import type { Account, Contact, PositioningBrief } from './database.types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface BriefInput {
  account: Account
  contacts: Contact[]
  recentSignals?: string[]
}

interface BriefOutput {
  positioning_statement: {
    for: string
    category: string
    key_benefit: string
    unlike: string
    because: string
  }
  core_message: string
  persona_messages: Record<string, string>
  proof_points: string[]
  objection_handlers: Array<{ objection: string; response: string }>
  recommended_tone: string
  key_themes: string[]
}

export async function generatePositioningBrief(input: BriefInput): Promise<BriefOutput> {
  const { account, contacts, recentSignals = [] } = input

  const verticalCtx = VERTICAL_CONTEXT[account.industry_vertical]
  const geoCtx = GEOGRAPHY_CONTEXT[account.geography]
  const maturityCtx = MATURITY_CONTEXT[account.digital_maturity]
  const proofPoints = getProofPointsForAccount(account.industry_vertical, 3)

  const personaList = contacts.map(c => `- ${c.name}, ${c.title} (${c.persona_type}) — Pain points: ${c.inferred_pain_points.join(', ')}`).join('\n')

  const userPrompt = `Generate a positioning brief for the following account. Output ONLY valid JSON matching the schema below — no markdown, no explanation.

ACCOUNT CONTEXT:
Company: ${account.name}
Industry: ${account.industry_vertical}
Geography: ${account.geography}
Employees: ${account.employee_count.toLocaleString()}
Digital Maturity: ${account.digital_maturity}/5 — ${maturityCtx.description}
Lifecycle Stage: ${account.lifecycle_stage}
Primary Use Case: ${account.primary_use_case ?? 'Not defined'}
Description: ${account.description ?? 'No description available'}

BUYING GROUP:
${personaList || 'No contacts defined yet'}

VERTICAL CONTEXT:
Key pains in ${account.industry_vertical}: ${verticalCtx?.keyPains.join(', ')}
Regulatory pressure: ${verticalCtx?.regulatoryPressure}
Language style: ${verticalCtx?.languageStyle}
Typical entry use case: ${verticalCtx?.typicalEntryUseCase}

GEOGRAPHY CONTEXT:
${geoCtx?.culturalNotes}
Partnership note: ${geoCtx?.partnershipNote}
Key theme for this region: ${geoCtx?.keyTheme}

MATURITY-BASED MESSAGE:
${maturityCtx.message}
Recommended entry point: ${maturityCtx.entryPoint}

AVAILABLE PROOF POINTS:
${proofPoints.map(p => `- ${p.headline} (${p.metric}) — ${p.use_case}`).join('\n')}

${recentSignals.length > 0 ? `RECENT SIGNALS (incorporate into message relevance):\n${recentSignals.join('\n')}` : ''}

WRITING RULES:
- positioning_statement values use SENTENCE CASE — start with lowercase unless proper noun. They concatenate into one sentence.
- core_message is an INTERNAL strategic narrative for the AE — NEVER sent to the customer. Write it in 3rd person about the account. NEVER use "you" or "your". EXACTLY 2 sentences. Sentence 1: the strategic moment (budget, trigger, timing). Sentence 2: the play (site, named buying-group contact, sequence).
- NEVER invent Tulip-side names. Refer to Tulip's side as "the AE" or the role in assigned_ae (e.g. "EMEA Pharma AE"). Buying-group contact names from the account context ARE real and should be used.
- Each key_theme is formatted as "Pillar Title — One sentence explanation (max 18 words)". Use space-emdash-space as separator.
- No filler language. No "solutions", "unlock", "leverage", "empower", "transform", "seamless", "robust", "comprehensive".

BANNED RECYCLED PHRASES (these appear in every brief and reveal the template):
- "composable frontline operations platform" — invent a vertical-specific category phrase instead (e.g. "flight-line operations layer" for aerospace, "GxP-ready frontline layer" for pharma, "kaizen-rate production platform" for Japan/discrete).
- "live in weeks, not years" / "in weeks, not years" — anchor to a real event at this account: "before the next FDA inspection cycle", "before Axonics integration closes", "before the DoD contract ramp hits full scale".
- "no IT bottleneck, no vendor lock-in" — say this only once per brief, and only if the data shows this is actually an account concern.

PROOF POINT SPECIFICITY:
- Every proof point must include EITHER a named customer OR a specific number with unit (95%, 34% MoM, €200M, 18 months).
- The words "significantly", "dramatically", "materially", "substantially", "meaningfully" are BANNED in proof points.
- If the data is soft, write "[SOFT — needs validation]" at the end rather than dressing with vague adjectives.

PERSONA MESSAGES:
- Generate persona_messages ONLY for contacts that appear in the BUYING GROUP list above. Do NOT invent placeholder personas.
- NEVER open a persona message with the contact's first name + comma. Open with the insight itself.
- 2nd person ("you") is CORRECT in persona_messages — they are customer-facing outreach drafts.

OUTPUT SCHEMA:
{
  "positioning_statement": {
    "for": "WHO this is for, 8-20 words, lowercase start. Example: 'pharma manufacturing leaders modernizing under compliance pressure'",
    "category": "What Tulip is, lowercase start. Example: 'a composable frontline operations platform'",
    "key_benefit": "The #1 outcome, 8-20 words, lowercase start. Example: 'replaces paper batch records with auditable digital workflows in weeks, not years'",
    "unlike": "The main alternative being displaced, lowercase start. Example: 'monolithic MES that require 18-24 month deployments and vendor lock-in'",
    "because": "The unfair advantage, lowercase start. Example: 'process engineers own and adapt the apps directly, without IT bottlenecks'"
  },
  "core_message": "EXACTLY 2 sentences. Sentence 1: the specific strategic moment driving this account now (budget, trigger, timing). Sentence 2: the specific Tulip approach that wins this account (beachhead, use case, speed). Do not restate the positioning_statement.",
  "persona_messages": {
    "[Persona Type or Name]": "1-2 sentence message tailored to this specific person's role and pain points"
  },
  "proof_points": ["string", "string", "string"],
  "objection_handlers": [
    { "objection": "string", "response": "string" },
    { "objection": "string", "response": "string" }
  ],
  "recommended_tone": "one of: consultative | challenger | empathetic | technical | executive",
  "key_themes": ["Title — One sentence explaining what this pillar means in the AE conversation (max 18 words).", "Title — ...", "Title — ..."]
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT_BASE,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  // Strip any markdown code blocks if present
  const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(jsonText) as BriefOutput
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${jsonText.slice(0, 200)}`)
  }
}
