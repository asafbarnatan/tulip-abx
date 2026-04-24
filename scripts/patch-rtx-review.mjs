// RTX (Raytheon Technologies) review pass — 2026-04-24.
//
//   1. Strip trailing periods from 5 positioning_statement fragments
//   2. Reinsert '\n' separators in core_message so the UI parser renders
//      WHY NOW / THE PLAY as bulleted sections (was stored as one paragraph)
//   3. approved: false → true
//   4. Delete 3 duplicate raw-text-notes play rows (the other 3 JSON-backed
//      rows cover the same personas with proper Target/WhyNow/Opener/Rationale)
//   5. CMMC 2.0 tense: "enforcement starts November 2025" → "has been in force
//      since Nov 10, 2025" (today is 2026-04-24; it's been in force 5+ months)
//   6. Sharpen accounts.description with specific capacity + compliance detail
//   7. Verified Metis Strategy interview reference → no edit needed
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const briefId = 'ce223538-9102-40b0-9d59-639e9e6c3fd5'
const acctId = 'e049cc6b-ee3f-460f-bae8-330c9358de03'
const { data: current } = await sb.from('positioning_briefs').select('*').eq('id', briefId).single()

// ---- 1. Strip trailing periods from positioning_statement ----
const stripPeriod = s => typeof s === 'string' && s.endsWith('.') ? s.slice(0, -1) : s
const ps = { ...current.positioning_statement }
for (const field of ['for', 'unlike', 'because', 'category', 'key_benefit']) {
  ps[field] = stripPeriod(ps[field])
}

// ---- 2. Reconstruct core_message with \n separators matching the format
//     used by Daikin / Bayer / BSC / TF. Stored value has literal backslash-n
//     chars (the UI parser splits on that). In JS source "\\n" = 2 chars.
const newCoreMessage = [
  'WHY NOW:',
  "- Pratt & Whitney's $200M Columbus forging expansion and $100M three-site MRO buildout are selecting digital tooling for lines that will run for decades.",
  "- The $8.4M FCA cybersecurity settlement has elevated traceability and compliance visibility to the RTX C-suite, making CMMC 2.0 readiness non-negotiable.",
  "- RTX operates at digital maturity 2 with paper travelers across legacy facilities while Campisi publicly mandates an enterprise digital thread — the gap is the opening.",
  '',
  'THE PLAY:',
  "- The AE opens with Satheeshkumar Kumarasingam, P&W's CDO, who bridges Campisi's digital thread vision and actual plant-floor deployment.",
  "- Position a guided work instruction pilot on one Columbus forging cell before the new isothermal press goes live, scoping AS9100 traceability from day one.",
  "- Use the Columbus proof point to sequence into the three MRO expansion sites where paper-traveler variability compounds with GTF engine ramp volume.",
].join('\\n')

// ---- 5. CMMC 2.0 tense fix in key_themes[1] ----
const newKeyThemes = [...current.key_themes]
newKeyThemes[1] = "Post-FCA traceability — the $8.4M settlement makes every paper-based record gap a liability, and CMMC 2.0 has been in force since Nov 10, 2025. Tulip MCP exposes the audit trail directly to compliance agents and enterprise auditors."

// ---- 3 + 1 + 2 + 5: brief update ----
const briefUpdate = {
  positioning_statement: ps,
  core_message: newCoreMessage,
  key_themes: newKeyThemes,
  approved: true,
}

const { error: briefErr } = await sb.from('positioning_briefs').update(briefUpdate).eq('id', briefId)
if (briefErr) { console.error('brief update error:', briefErr.message); process.exit(1) }
console.log('Brief: periods stripped, core_message reformatted, CMMC tense updated, approved=true.')

// ---- 6. Sharpened account description ----
const newDescription = "Major aerospace and defense manufacturer spanning Pratt & Whitney (engines + MRO), Collins Aerospace (avionics + cabin systems), and Raytheon (defense systems). Tier 2 prospect — digital maturity 2 with paper travelers across legacy facilities, $300M+ in new capacity (Columbus forging + 3-site MRO expansion) selecting digital tooling now, and $8.4M FCA settlement forcing CMMC 2.0 traceability across 29 DFARS contracts."
const { error: acctErr } = await sb.from('accounts').update({ description: newDescription }).eq('id', acctId)
if (acctErr) { console.error('accounts update error:', acctErr.message); process.exit(1) }
console.log('Account description sharpened.')

// ---- 4. Delete the 3 raw-text-notes play rows ----
const { data: actions } = await sb.from('account_actions').select('id, notes').eq('account_id', acctId)
const rawTextPlayIds = (actions ?? [])
  .filter(a => typeof a.notes === 'string' && !a.notes.trim().startsWith('{') && /^PLAY:/i.test(a.notes.trim()))
  .map(a => a.id)
if (rawTextPlayIds.length > 0) {
  const { error: delErr } = await sb.from('account_actions').delete().in('id', rawTextPlayIds)
  if (delErr) { console.error('play delete error:', delErr.message); process.exit(1) }
  console.log(`Deleted ${rawTextPlayIds.length} raw-text play rows (duplicates of the JSON-backed ones).`)
} else {
  console.log('No raw-text play rows found to delete.')
}

// ---- Verification ----
console.log('')
console.log('Verifying...')
const { data: verify } = await sb.from('positioning_briefs').select('*').eq('id', briefId).single()
const { data: verifyAcct } = await sb.from('accounts').select('description').eq('id', acctId).single()
const { data: remainingActions } = await sb.from('account_actions').select('id, notes').eq('account_id', acctId)

const psVerify = verify.positioning_statement
const stillHasPeriods = ['for', 'unlike', 'because', 'category', 'key_benefit'].filter(f => typeof psVerify[f] === 'string' && psVerify[f].endsWith('.'))
console.log(`  trailing periods on positioning_statement: ${stillHasPeriods.length === 0 ? 'NONE' : stillHasPeriods.join(', ')}`)
console.log(`  core_message has "\\n" separators: ${verify.core_message.includes('\\n')}`)
console.log(`  CMMC tense updated: ${verify.key_themes[1].includes('has been in force since')}`)
console.log(`  approved: ${verify.approved}`)
console.log(`  account.description length: ${verifyAcct.description.length} chars`)
console.log(`  remaining actions: ${remainingActions.length} (3 JSON + 0 raw-text expected)`)

const flat = JSON.stringify([verify.positioning_statement, verify.core_message, verify.key_themes, verify.persona_messages, verify.proof_points, verify.objection_handlers])
const banned = ['layers on top', 'does not replace MES', 'rip-and-replace', '[CUSTOMER NAME REQUIRED]', '[SOFT']
const hits = banned.filter(p => flat.includes(p))
console.log(`  banned phrases: ${hits.length === 0 ? 'NONE' : hits.join(', ')}`)

const verified = [
  { phrase: 'Pratt Miller Engineering', note: 'real Tulip defense customer' },
  { phrase: 'FedRAMP Moderate Equivalency', note: 'verified certification' },
  { phrase: 'Metis Strategy interview', note: 'verified — Technovation 652, Peter High' },
  { phrase: 'composable MES', note: 'Nathan framing' },
  { phrase: 'has been in force since Nov 10, 2025', note: 'CMMC tense fixed' },
]
console.log('  verified claims retained:')
for (const { phrase, note } of verified) {
  console.log(`    ${flat.includes(phrase) ? 'OK  ' : 'MISS'} "${phrase}" — ${note}`)
}
