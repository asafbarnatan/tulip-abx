// Fix the two remaining fabricated "existing Tulip customer" references on
// Boston Scientific that surfaced in the UI (not in the brief): the account
// description field + the SignalWatcherAgent's cached urgency_reason.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const bscId = '0b322ff0-0961-4d0e-b852-e8f2ae256c0e'

// 1. accounts.description — strip "EXISTING TULIP CUSTOMER across 2 sites"
const newDescription = "Global medical device manufacturer. Tier 1 prospect — active Form 483 scrutiny post-recall, Cork greenfield ramping to 16M devices/year, and $3.7B Axonics acquisition adding sites create the opening for a multi-site digitization pilot."
const { error: descErr } = await sb.from('accounts').update({ description: newDescription }).eq('id', bscId)
if (descErr) { console.error('description update:', descErr.message); process.exit(1) }
console.log('accounts.description: fabricated customer claim removed.')

// 2. SignalWatcherAgent latest run output_summary — rewrite BSC entry's
//    urgency_reason to drop "Existing 2-site customer" and bump 830+ → 832.
const { data: runs } = await sb.from('agent_runs')
  .select('id, output_summary')
  .eq('agent_name', 'SignalWatcherAgent')
  .order('completed_at', { ascending: false })
  .limit(1)
const latest = runs?.[0]
if (!latest?.output_summary) { console.error('no SignalWatcher run found'); process.exit(1) }

const parsed = JSON.parse(latest.output_summary)
const bscIdx = parsed.findIndex(p => p.account_id === bscId)
if (bscIdx === -1) { console.error('BSC entry not in ranking'); process.exit(1) }

console.log(`  before: ${parsed[bscIdx].urgency_reason}`)
parsed[bscIdx] = {
  ...parsed[bscIdx],
  urgency_reason: "Class I pacemaker recall (832 injuries, 2 deaths), Cork greenfield targeting 16M devices/yr, and $3.7B Axonics acquisition adding sites — zero touchpoints in 30 days",
}
console.log(`  after:  ${parsed[bscIdx].urgency_reason}`)

const { error: runErr } = await sb.from('agent_runs')
  .update({ output_summary: JSON.stringify(parsed) })
  .eq('id', latest.id)
if (runErr) { console.error('agent_run update:', runErr.message); process.exit(1) }
console.log(`SignalWatcherAgent run ${latest.id}: BSC urgency_reason cleaned.`)
