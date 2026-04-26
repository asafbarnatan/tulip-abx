// Scan every content surface for the forbidden "Tulip sits above MES" framings.
// Report-only — does not mutate. Run scrub script after reviewing report.
//
// Forbidden patterns (Asaf, Apr 26): any phrasing that positions Tulip as
// additive to / layered above / sitting on top of an existing MES or ERP.
// Tulip IS the MES. See lib/agents/content-rules.ts.
//
// PROTECTED: the live Bayer AG April 2026 LinkedIn campaign
// (linkedin_campaign_id = 690308904). Do NOT mutate its row in any scrub.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((a, l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) a[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
  return a
}, {})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const PATTERNS = [
  /sits?\s+(above|on\s+top\s+of)/i,
  /sitting\s+(above|on\s+top\s+of)/i,
  /above\s+your\s+(existing\s+)?(MES|ERP|SAP)/i,
  /above\s+(MES|ERP)/i,
  /layer(s|ed)?\s+(above|on\s+top\s+of)/i,
  /layer\s+to\s+your\s+(MES|ERP)/i,
  /complements?\s+(your\s+)?MES/i,
  /additive\s+to\s+(MES|ERP)/i,
  /fills\s+the\s+gap\s+above/i,
  /Layer,?\s+don'?t\s+replace/i,
  /doesn'?t\s+replace\s+your\s+MES/i,
  /digital\s+production\s+layer/i,
]

const matchAny = (text) => {
  if (typeof text !== 'string') return null
  for (const p of PATTERNS) {
    const m = text.match(p)
    if (m) return { pattern: p.source, snippet: text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40) }
  }
  return null
}

const findings = []

const recordHit = (table, rowId, field, hit, accountName) => {
  findings.push({ table, rowId, field, accountName, pattern: hit.pattern, snippet: hit.snippet })
}

// 1. linkedin_campaigns
const { data: campaigns } = await sb.from('linkedin_campaigns').select('id, campaign_name, headline, ad_copy, linkedin_campaign_id, accounts(name)')
for (const c of campaigns ?? []) {
  const protectedRow = c.linkedin_campaign_id === '690308904' || /Bayer AG.*April 2026/i.test(c.campaign_name ?? '')
  const tag = protectedRow ? '[PROTECTED]' : ''
  for (const field of ['headline', 'ad_copy']) {
    const hit = matchAny(c[field])
    if (hit) recordHit(`linkedin_campaigns ${tag}`.trim(), c.id, field, hit, c.accounts?.name ?? c.campaign_name)
  }
}

// 2. positioning_briefs — many JSONB fields to check
const { data: briefs } = await sb.from('positioning_briefs').select('id, account_id, positioning_statement, core_message, key_themes, persona_messages, proof_points, objection_handlers, recommended_tone, accounts(name)')
for (const b of briefs ?? []) {
  // String fields
  for (const field of ['core_message', 'recommended_tone']) {
    const hit = matchAny(b[field])
    if (hit) recordHit('positioning_briefs', b.id, field, hit, b.accounts?.name)
  }
  // JSONB positioning_statement: check each value
  if (b.positioning_statement && typeof b.positioning_statement === 'object') {
    for (const [k, v] of Object.entries(b.positioning_statement)) {
      const hit = matchAny(v)
      if (hit) recordHit('positioning_briefs', b.id, `positioning_statement.${k}`, hit, b.accounts?.name)
    }
  }
  // Array of strings: key_themes, proof_points
  for (const field of ['key_themes', 'proof_points']) {
    if (Array.isArray(b[field])) {
      b[field].forEach((s, i) => {
        const hit = matchAny(s)
        if (hit) recordHit('positioning_briefs', b.id, `${field}[${i}]`, hit, b.accounts?.name)
      })
    }
  }
  // JSONB persona_messages: object of strings
  if (b.persona_messages && typeof b.persona_messages === 'object') {
    for (const [persona, msg] of Object.entries(b.persona_messages)) {
      const hit = matchAny(msg)
      if (hit) recordHit('positioning_briefs', b.id, `persona_messages.${persona}`, hit, b.accounts?.name)
    }
  }
  // JSONB objection_handlers: array of {objection, response}
  if (Array.isArray(b.objection_handlers)) {
    b.objection_handlers.forEach((oh, i) => {
      for (const field of ['objection', 'response']) {
        const hit = matchAny(oh?.[field])
        if (hit) recordHit('positioning_briefs', b.id, `objection_handlers[${i}].${field}`, hit, b.accounts?.name)
      }
    })
  }
}

// 3. account_actions (plays — notes JSON has opener/why_now/rationale)
const { data: actions } = await sb.from('account_actions').select('id, account_id, action_type, notes, accounts(name)')
for (const a of actions ?? []) {
  const hit = matchAny(a.notes)
  if (hit) recordHit('account_actions', a.id, 'notes', hit, a.accounts?.name)
}

// 4. accounts (description)
const { data: accts } = await sb.from('accounts').select('id, name, description')
for (const a of accts ?? []) {
  const hit = matchAny(a.description)
  if (hit) recordHit('accounts', a.id, 'description', hit, a.name)
}

// 5. signals
const { data: signals } = await sb.from('signals').select('id, account_id, content, source, accounts(name)')
for (const s of signals ?? []) {
  for (const field of ['content', 'source']) {
    const hit = matchAny(s[field])
    if (hit) recordHit('signals', s.id, field, hit, s.accounts?.name)
  }
}

if (findings.length === 0) {
  console.log('Clean — no violations found.')
  process.exit(0)
}

console.log(`Found ${findings.length} violation${findings.length === 1 ? '' : 's'}:\n`)
const grouped = {}
for (const f of findings) {
  const key = `${f.accountName ?? 'UNKNOWN'} · ${f.table}`
  ;(grouped[key] ??= []).push(f)
}
for (const [key, list] of Object.entries(grouped)) {
  console.log(`\n=== ${key} ===`)
  for (const f of list) {
    console.log(`  • ${f.field}  (rowId=${f.rowId.slice(0, 8)}…)`)
    console.log(`    pattern: ${f.pattern}`)
    console.log(`    snippet: …${f.snippet}…`)
  }
}
