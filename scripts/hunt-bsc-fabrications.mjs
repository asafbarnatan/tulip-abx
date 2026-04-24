// Full scan for any remaining fabricated "2 Boston Scientific sites" claim
// across every text-bearing table in the database. Reports + fixes in-place.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const bscId = '0b322ff0-0961-4d0e-b852-e8f2ae256c0e'

// Patterns that indicate the fabricated "2-site customer" claim.
const fabricatedPatterns = [
  /two Boston Scientific sites/i,
  /2 Boston Scientific sites/i,
  /Boston Scientific['']?s existing 2-site/i,
  /Boston Scientific['']?s existing 2 site/i,
  /existing 2-site Tulip deployment/i,
  /existing 2 site Tulip deployment/i,
  /already running guided assembly.{0,30}at two Boston/i,
  /2-site deployment.{0,60}proof point/i,
  /Tulip is already running.{0,40}at two Boston/i,
  /Tulip already runs at 2 Boston/i,
]

function scanText(label, id, text) {
  if (typeof text !== 'string' || !text) return []
  const hits = fabricatedPatterns.filter(re => re.test(text))
  if (hits.length === 0) return []
  return [{ label, id, snippet: text.slice(0, 500), patterns: hits.map(r => r.source) }]
}

const findings = []

// account_actions: scan notes (JSON string) for all BSC account_actions
const { data: actions } = await sb.from('account_actions').select('*').eq('account_id', bscId)
for (const a of actions ?? []) {
  findings.push(...scanText(`account_actions.notes [${a.action_type} → ${a.contact_name ?? a.performed_by ?? '?'}]`, a.id, a.notes))
}

// positioning_briefs: scan every text-bearing field
const { data: briefs } = await sb.from('positioning_briefs').select('*').eq('account_id', bscId)
for (const b of briefs ?? []) {
  const stringified = JSON.stringify([b.positioning_statement, b.core_message, b.key_themes, b.persona_messages, b.proof_points, b.objection_handlers])
  findings.push(...scanText(`positioning_briefs[${b.id}]`, b.id, stringified))
}

// accounts: scan description, icp_fit_reason (and any other text fields)
const { data: accts } = await sb.from('accounts').select('*').eq('id', bscId)
for (const a of accts ?? []) {
  for (const [k, v] of Object.entries(a)) {
    if (typeof v === 'string') {
      findings.push(...scanText(`accounts.${k}`, a.id, v))
    }
  }
}

// signals
const { data: signals } = await sb.from('signals').select('*').eq('account_id', bscId)
for (const s of signals ?? []) {
  findings.push(...scanText(`signals[${s.signal_type}]`, s.id, s.content))
}

// agent_runs: check output_summary for all runs mentioning BSC
const { data: runs } = await sb.from('agent_runs').select('id, agent_name, output_summary, input_summary').order('completed_at', { ascending: false }).limit(50)
for (const r of runs ?? []) {
  if (r.output_summary) findings.push(...scanText(`agent_runs[${r.agent_name}].output_summary`, r.id, r.output_summary))
  if (r.input_summary)  findings.push(...scanText(`agent_runs[${r.agent_name}].input_summary`,  r.id, r.input_summary))
}

// custom_plays (in case someone created one)
try {
  const { data: cps } = await sb.from('custom_plays').select('*').eq('account_id', bscId)
  for (const cp of cps ?? []) {
    const stringified = JSON.stringify(cp)
    findings.push(...scanText(`custom_plays[${cp.id}]`, cp.id, stringified))
  }
} catch { /* table may not exist pre-migration */ }

console.log('='.repeat(80))
console.log(`Found ${findings.length} fabricated-claim hits on BSC`)
console.log('='.repeat(80))
for (const f of findings) {
  console.log(`\n[${f.label}]  row id: ${f.id}`)
  console.log(`  snippet: ${f.snippet.slice(0, 300)}${f.snippet.length > 300 ? '…' : ''}`)
  console.log(`  matched patterns: ${f.patterns.join(' | ')}`)
}
