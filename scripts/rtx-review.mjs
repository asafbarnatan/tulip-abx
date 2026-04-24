import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const { data: acct } = await sb.from('accounts').select('*').ilike('name', '%rtx%').maybeSingle()
if (!acct) { console.error('no RTX account'); process.exit(1) }

console.log('=== ACCOUNT ===')
console.log(`id:                  ${acct.id}`)
console.log(`name:                ${acct.name}`)
console.log(`tier:                ${acct.tier}`)
console.log(`lifecycle_stage:     ${acct.lifecycle_stage}`)
console.log(`interaction_stage:   ${acct.interaction_stage ?? 'null'}`)
console.log(`industry_vertical:   ${acct.industry_vertical}`)
console.log(`geography:           ${acct.geography}`)
console.log(`headquarters:        ${JSON.stringify(acct.headquarters)}`)
console.log(`employee_count:      ${acct.employee_count}`)
console.log(`digital_maturity:    ${acct.digital_maturity}/5`)
console.log(`icp_fit_score:       ${acct.icp_fit_score}`)
console.log(`intent_score:        ${acct.intent_score}`)
console.log(`engagement_score:    ${acct.engagement_score}`)
console.log(`primary_use_case:    ${acct.primary_use_case}`)
console.log(`assigned_ae:         ${acct.assigned_ae ?? 'null'}`)
console.log(`description:         ${acct.description ?? 'null'}`)

console.log('\n=== POSITIONING BRIEF (latest) ===')
const { data: briefs } = await sb.from('positioning_briefs')
  .select('*').eq('account_id', acct.id).order('generated_at', { ascending: false }).limit(1)
const b = briefs?.[0]
if (b) {
  console.log(`id: ${b.id}  approved: ${b.approved}  generated_at: ${b.generated_at}  tone: ${b.recommended_tone}`)
  console.log('\n--- positioning_statement ---')
  console.log(JSON.stringify(b.positioning_statement, null, 2))
  console.log('\n--- core_message ---')
  console.log(b.core_message)
  console.log('\n--- key_themes ---')
  for (const t of b.key_themes ?? []) console.log(`  - ${t}`)
  console.log('\n--- persona_messages ---')
  for (const [k, v] of Object.entries(b.persona_messages ?? {})) {
    console.log(`  [${k}]`)
    console.log(`    ${v}`)
  }
  console.log('\n--- proof_points ---')
  for (const p of b.proof_points ?? []) console.log(`  - ${p}`)
  console.log('\n--- objection_handlers ---')
  for (const o of b.objection_handlers ?? []) {
    console.log(`  OBJECTION: ${o.objection}`)
    console.log(`  RESPONSE:  ${o.response}`)
    console.log('')
  }
}

console.log('\n=== CONTACTS ===')
const { data: contacts } = await sb.from('contacts').select('*').eq('account_id', acct.id).order('created_at', { ascending: false })
for (const c of contacts ?? []) {
  console.log(`  ${(c.name || '').padEnd(28)} ${(c.title || '').slice(0, 70).padEnd(70)} role=${c.persona_type ?? 'null'}`)
}

console.log('\n=== PLAYS (account_actions) ===')
const { data: actions } = await sb.from('account_actions').select('*').eq('account_id', acct.id).order('created_at', { ascending: false }).limit(30)
for (const a of actions ?? []) {
  console.log(`  [${a.action_type}]  outcome=${a.outcome ?? 'null'}  ${a.created_at?.slice(0,10)}`)
  if (a.notes) {
    try {
      const n = JSON.parse(a.notes)
      console.log(`     play: ${n.play_name ?? '?'}`)
      if (n.target) console.log(`     target: ${String(n.target).slice(0, 120)}`)
    } catch {
      console.log(`     notes: ${a.notes.slice(0, 140)}${a.notes.length > 140 ? '…' : ''}`)
    }
  }
}

console.log('\n=== SIGNALS ===')
const { data: signals } = await sb.from('signals').select('*').eq('account_id', acct.id).order('created_at', { ascending: false })
for (const s of signals ?? []) {
  console.log(`  [${s.signal_type}] source=${s.source ?? '-'}  sentiment=${s.sentiment ?? '-'}`)
  if (s.content) console.log(`    ${s.content.slice(0, 300)}${s.content.length > 300 ? '…' : ''}`)
}

console.log('\n=== LINKEDIN CAMPAIGNS ===')
const { data: campaigns } = await sb.from('linkedin_campaigns').select('*').eq('account_id', acct.id).order('created_at', { ascending: false })
for (const c of campaigns ?? []) {
  console.log(`  ${c.campaign_name}  [${c.status}]`)
  console.log(`    impr=${c.impressions}  clicks=${c.clicks}  leads=${c.leads}  $${c.cost_usd}`)
}
