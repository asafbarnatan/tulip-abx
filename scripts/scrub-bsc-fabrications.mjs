// Final sweep of residual "2 Boston Scientific sites" fabrications beyond the
// current-approved brief: the 3 pending email actions (Paudie, Jodi, Rosaleen)
// + the older superseded brief 730c1b29 (approved=false, pre-18:35:38).
//
// Each action's notes JSON is rewritten: opener + why_now reframed as a
// prospect pitch; rationale preserved (no fabricated claims). Rosaleen's
// "830+ injuries" also bumped to "832" to match the FDA-sourced signal.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// ---- rewrites ----

const paudieId = 'b81b72f8-4b1d-4654-b118-24cb1f9546fb'
const jodiId   = '8c5e5083-8bdb-4b4d-acda-b7d8864855a0'
const roseId   = 'a74290b4-782b-43aa-bb2e-c6a023f55e02'

async function rewriteAction(id, patchFn) {
  const { data: row } = await sb.from('account_actions').select('notes').eq('id', id).single()
  const parsed = JSON.parse(row.notes)
  const updated = patchFn(parsed)
  const { error } = await sb.from('account_actions').update({ notes: JSON.stringify(updated) }).eq('id', id)
  if (error) throw error
  return updated
}

// Paudie O'Connor
await rewriteAction(paudieId, n => ({
  ...n,
  opener: "Paudie, the $3.7B Axonics integration and the Cork greenfield targeting 16M devices per year are both staging for the same decision: which frontline platform standardizes DHR and quality inspection across the combined footprint. Tulip's composable-MES model lets you run one pilot line — at Cork, Arden Hills, or an Axonics site — and template it to the rest by configuration, not per-site re-implementation. I'd like to bring you a multi-site expansion business case that fits your consolidated operations remit: one decision, one approval, a path to all six-plus sites. Would a 45-minute executive briefing with your operations leadership team work in the next few weeks?",
  why_now: [
    n.why_now[0],
    n.why_now[1],
    "Tulip's composable-MES architecture is production-proven at Fortune 500 medical device manufacturers and scales by configuration rather than per-site re-implementation — directly aligned with the operational efficiency mandate O'Connor carries across the global footprint.",
  ],
}))
console.log('Paudie O\'Connor action rewritten.')

// Jodi Euerle Eddy
await rewriteAction(jodiId, n => ({
  ...n,
  opener: "Jodi, your GenAI and anomaly-detection models need structured frontline data — operator actions, in-process measurements, deviation context — that paper records and legacy MES transaction logs don't produce at the resolution you need. Tulip generates that data as a byproduct of guided assembly and quality inspection, and Tulip MCP exposes it directly to your AI stack. I'd like to show you how that data backbone can be architected into Cork from day one and extended across the Axonics sites, so your ML pipeline gets production-grade input without a retrofit. Could we schedule a 45-minute technical session with your IT/OT architecture team?",
  why_now: [
    n.why_now[0],
    n.why_now[1],
    "Axonics digital stack integration into Boston Scientific enterprise platforms is underway, and Tulip's composable-MES IT/OT integration pattern — proven at Fortune 500 medical device manufacturers — can be architected into Cork and the Axonics sites from day one.",
  ],
}))
console.log('Jodi Euerle Eddy action rewritten.')

// Rosaleen Burke
await rewriteAction(roseId, n => ({
  ...n,
  opener: "Rosaleen, Tulip's DHR and guided-assembly model — proven at Tulip medical device customers running fully paperless digital DHR — generates auditable device history records as operators build. That's the capability your team needs on the Accolade and stent production lines while FDA scrutiny at Arden Hills is active. I'd like to walk you through how Factory Playback can pinpoint the exact moment a process deviation occurs so your next FDA visit finds a standing audit trail, not a prep sprint. Would a 30-minute session with your quality engineering leads make sense in the next two weeks?",
  why_now: [
    "Two Class I manufacturing-defect recalls in 12 months — the Accolade pacemaker (832 injuries, 2 deaths) and 26,570 carotid stents — have placed Burke's quality organization under direct FDA scrutiny with active Form 483 activity at the Arden Hills site.",
    "Tulip's DHR and guided-assembly model is production-proven at Tulip medical device customers — giving Burke a remediation tool she can deploy on the affected production lines on a pilot-first basis, without a monolithic MES evaluation cycle.",
    n.why_now[2],
  ],
}))
console.log('Rosaleen Burke action rewritten.')

// Delete the older superseded brief
const oldBriefId = '730c1b29-d572-4f95-a1f9-ce99803dc21c'
const { error: delErr } = await sb.from('positioning_briefs').delete().eq('id', oldBriefId)
if (delErr) { console.error('delete older brief error:', delErr.message); process.exit(1) }
console.log(`Older superseded brief ${oldBriefId} deleted.`)

console.log('\nRe-running full-DB fabrication scan...')
// Inline scan — same patterns as hunt-bsc-fabrications.mjs
const bscId = '0b322ff0-0961-4d0e-b852-e8f2ae256c0e'
const patterns = [/two Boston Scientific sites/i, /2 Boston Scientific sites/i, /existing 2-site/i, /Tulip already runs at 2 Boston/i, /already running guided assembly.{0,30}at two Boston/i, /830\+ injur/i]

const { data: a } = await sb.from('account_actions').select('*').eq('account_id', bscId)
const { data: b } = await sb.from('positioning_briefs').select('*').eq('account_id', bscId)
const { data: acct } = await sb.from('accounts').select('*').eq('id', bscId).single()
const { data: sig } = await sb.from('signals').select('*').eq('account_id', bscId)
const { data: runs } = await sb.from('agent_runs').select('id, agent_name, output_summary, input_summary').order('completed_at', { ascending: false }).limit(50)

let remaining = 0
const scan = (label, text) => {
  if (typeof text !== 'string') return
  for (const re of patterns) if (re.test(text)) { console.log(`  HIT [${label}]:`, re.source); remaining++; break }
}
for (const row of a ?? []) scan(`account_actions[${row.id}]`, row.notes)
for (const row of b ?? []) scan(`positioning_briefs[${row.id}]`, JSON.stringify(row))
for (const [k,v] of Object.entries(acct ?? {})) if (typeof v === 'string') scan(`accounts.${k}`, v)
for (const row of sig ?? []) scan(`signals[${row.id}]`, row.content)
for (const row of runs ?? []) {
  scan(`agent_runs[${row.agent_name}].output_summary`, row.output_summary)
  scan(`agent_runs[${row.agent_name}].input_summary`, row.input_summary)
}
if (remaining === 0) console.log('  NONE — BSC is clean across actions, briefs, account, signals, and agent runs.')
else console.log(`\n  ${remaining} residual hit(s) remain — manual review needed.`)
