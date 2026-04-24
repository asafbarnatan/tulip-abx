// Boston Scientific review pass — 2026-04-24.
//   1. Strip trailing periods from positioning_statement fragments (April
//      Dunford format: fragments combine into one sentence — no terminal
//      punctuation). Residue from earlier bracket-strip auto-terminator.
//   2. Add Frontline Copilot to Rosaleen Burke persona (inline operator
//      support during recall remediation).
//   3. Drop "AI Trigger Descriptions" from proof_points[2] — keep Factory
//      Playback as the named capability.
//   4. approved: false → true.
//   5. WHY NOW: "830+ injuries" → "832 injuries" (match FDA signal exactly).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const briefId = '49ed59e2-9493-4863-8f70-3dd6d46c38d5'
const { data: current, error: fetchErr } = await sb.from('positioning_briefs').select('*').eq('id', briefId).single()
if (fetchErr) { console.error('fetch error:', fetchErr.message); process.exit(1) }

// Helper: strip a single trailing period from a string fragment.
const stripPeriod = s => (typeof s === 'string' && s.endsWith('.')) ? s.slice(0, -1) : s

// ---- 1. positioning_statement: strip trailing periods on fragments ----
const ps = { ...current.positioning_statement }
for (const field of ['for', 'unlike', 'because', 'category', 'key_benefit']) {
  ps[field] = stripPeriod(ps[field])
}

// ---- 5. core_message: 830+ → 832 ----
const newCoreMessage = current.core_message.replace('830+ injuries, 2 deaths', '832 injuries, 2 deaths')
if (newCoreMessage === current.core_message) {
  console.error('WARN: "830+ injuries, 2 deaths" not found — verify core_message')
}

// ---- 2. Rosaleen Burke: add Frontline Copilot ----
const personas = { ...current.persona_messages }
personas["Rosaleen Burke"] = "Two manufacturing-defect recalls in 12 months and active Form 483 scrutiny at Arden Hills put every manual quality record under a microscope. Your existing Tulip DHR deployment already proves the model — guided assembly apps that generate auditable device history records as operators build, not after the fact. Extending that same capability to the Accolade and stent production lines gives your team inspection-ready traceability on every unit. Frontline Copilot supports operators inline through every DHR step, answering SOP questions at the station instead of sending them back to a printed binder, while Factory Playback pinpoints the exact moment a defect originated instead of reconstructing it from paper logs weeks later. The next FDA visit shouldn't require a prep sprint — it should find a standing audit trail."

// ---- 3. Drop AI Trigger Descriptions from proof_points[2] ----
const proofs = [...current.proof_points]
proofs[2] = "Tulip Factory Playback collapses root-cause analysis from multi-day investigations to same-shift corrective actions by overlaying time-synced video with production data — applicable to the Accolade battery-cathode defect and carotid-stent manufacturing defect investigations."

// ---- 4. approved: true ----
const update = {
  positioning_statement: ps,
  core_message: newCoreMessage,
  persona_messages: personas,
  proof_points: proofs,
  approved: true,
}

const { error } = await sb.from('positioning_briefs').update(update).eq('id', briefId)
if (error) { console.error('update error:', error.message); process.exit(1) }

console.log('Boston Scientific brief updated.')
console.log('')
console.log('Verifying...')
const { data: verify } = await sb.from('positioning_briefs').select('*').eq('id', briefId).single()
const flat = JSON.stringify([verify.positioning_statement, verify.core_message, verify.key_themes, verify.persona_messages, verify.proof_points, verify.objection_handlers])

const banned = ['AI Trigger Descriptions', '830+', 'layers on top', 'does not replace MES', 'rip-and-replace', '[CUSTOMER NAME REQUIRED]', '[SOFT']
const hits = banned.filter(p => flat.includes(p))
console.log(`  banned/removed phrases: ${hits.length === 0 ? 'NONE' : hits.join(', ')}`)

const ai = ['AI Composer', 'AI App Translation', 'Frontline Copilot', 'AI Insights', 'Tulip MCP', 'Factory Playback']
const found = ai.filter(f => flat.includes(f))
console.log(`  AI features cited: ${found.join(', ')}`)

// Check trailing-period fix worked
const psFields = verify.positioning_statement
const stillHasPeriods = ['for', 'unlike', 'because', 'category', 'key_benefit'].filter(f => typeof psFields[f] === 'string' && psFields[f].endsWith('.'))
console.log(`  positioning_statement fragments with trailing period: ${stillHasPeriods.length === 0 ? 'NONE' : stillHasPeriods.join(', ')}`)

// Confirm core_message update
console.log(`  core_message has "832 injuries": ${verify.core_message.includes('832 injuries')}`)
console.log(`  approved: ${verify.approved}`)
