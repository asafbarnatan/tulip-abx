import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const { data, error } = await sb.from('linkedin_campaigns').select('id, campaign_name, pinned_at, linkedin_campaign_id, impressions, cost_usd').order('created_at', { ascending: false })
if (error) { console.log('ERROR:', error.message); process.exit(1) }

console.log('pinned_at column: OK (query succeeded, no error)')
console.log('')
console.log('All campaigns:')
for (const c of data) {
  const live = c.linkedin_campaign_id && /^\d+$/.test(c.linkedin_campaign_id) ? ` · LIVE ${c.linkedin_campaign_id}` : ''
  console.log(`  ${c.pinned_at ? '[PINNED]' : '        '} ${c.campaign_name}${live}`)
  console.log(`             ${c.impressions} impr · $${Number(c.cost_usd).toFixed(2)} · pinned_at=${c.pinned_at ?? 'null'}`)
}
