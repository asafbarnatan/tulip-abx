// Pull everything we have on Daikin so the user can review content end-to-end.
// Account core fields, latest positioning brief, active plays, contacts,
// buying-group membership, logged actions, LinkedIn campaigns, recent signals.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const { data: acct } = await sb.from('accounts').select('*').ilike('name', '%daikin%').maybeSingle()
if (!acct) { console.error('no Daikin account'); process.exit(1) }

console.log('=== ACCOUNT ===')
console.log(`id:                  ${acct.id}`)
console.log(`name:                ${acct.name}`)
console.log(`tier:                ${acct.tier}`)
console.log(`lifecycle_stage:     ${acct.lifecycle_stage}`)
console.log(`interaction_stage:   ${acct.interaction_stage ?? 'null'}`)
console.log(`industry_vertical:   ${acct.industry_vertical}`)
console.log(`geography:           ${acct.geography}`)
console.log(`headquarters:        ${acct.headquarters}`)
console.log(`employee_count:      ${acct.employee_count}`)
console.log(`digital_maturity:    ${acct.digital_maturity}/5`)
console.log(`icp_fit_score:       ${acct.icp_fit_score}`)
console.log(`intent_score:        ${acct.intent_score}`)
console.log(`engagement_score:    ${acct.engagement_score}`)
console.log(`primary_use_case:    ${acct.primary_use_case}`)
console.log(`assigned_ae:         ${acct.assigned_ae ?? 'null'}`)
console.log(`icp_fit_reason:      ${acct.icp_fit_reason ?? 'null'}`)

console.log('\n=== POSITIONING BRIEF (latest) ===')
const { data: briefs } = await sb.from('positioning_briefs')
  .select('*').eq('account_id', acct.id).order('generated_at', { ascending: false }).limit(1)
const b = briefs?.[0]
if (b) {
  console.log(`id: ${b.id}  approved: ${b.approved}  generated_at: ${b.generated_at}`)
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
  console.log(`recommended_tone: ${b.recommended_tone ?? 'null'}`)
} else {
  console.log('(none)')
}

console.log('\n=== CONTACTS (buying group) ===')
const { data: contacts } = await sb.from('contacts').select('*').eq('account_id', acct.id).order('created_at', { ascending: false })
for (const c of contacts ?? []) {
  console.log(`  ${(c.name || '').padEnd(28)} ${(c.title || '').padEnd(48)} role=${c.buying_group_role ?? 'null'}  linkedin=${c.linkedin_url ? 'yes' : 'no'}`)
  if (c.source_notes) console.log(`     notes: ${c.source_notes}`)
}

console.log('\n=== PLAYS (account_actions) ===')
const { data: actions } = await sb.from('account_actions').select('*').eq('account_id', acct.id).order('created_at', { ascending: false }).limit(30)
for (const a of actions ?? []) {
  console.log(`  [${a.action_type}]  outcome=${a.outcome ?? 'null'}  name=${a.assigned_name ?? '-'}/role=${a.assigned_role ?? '-'}  ${a.created_at?.slice(0,10)}`)
  if (a.notes) console.log(`     notes: ${a.notes.slice(0, 200)}${a.notes.length > 200 ? '…' : ''}`)
}

console.log('\n=== LINKEDIN CAMPAIGNS ===')
const { data: campaigns } = await sb.from('linkedin_campaigns').select('*').eq('account_id', acct.id).order('created_at', { ascending: false })
for (const c of campaigns ?? []) {
  console.log(`  ${c.campaign_name}`)
  console.log(`    status=${c.status}  linkedin_id=${c.linkedin_campaign_id ?? '-'}  impr=${c.impressions}  clicks=${c.clicks}  leads=${c.leads}  $${c.cost_usd}`)
  if (c.headline) console.log(`    headline: ${c.headline}`)
  if (c.ad_copy) console.log(`    ad_copy (first 200): ${c.ad_copy.slice(0,200)}${c.ad_copy.length>200?'…':''}`)
}

console.log('\n=== SIGNALS (recent 10) ===')
const { data: signals } = await sb.from('signals').select('*').eq('account_id', acct.id).order('created_at', { ascending: false }).limit(10)
for (const s of signals ?? []) {
  console.log(`  [${s.signal_type}] urgency=${s.urgency ?? '-'}  processed=${s.processed ?? false}  ${s.created_at?.slice(0,10)}`)
  if (s.title) console.log(`    title: ${s.title}`)
  if (s.description) console.log(`    desc:  ${s.description.slice(0, 200)}${s.description.length > 200 ? '…' : ''}`)
}
