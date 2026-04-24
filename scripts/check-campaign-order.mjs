import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Try full query first; if display_order column missing, fall back.
let query = sb
  .from('linkedin_campaigns')
  .select('id, campaign_name, pinned_at, display_order, created_at, linkedin_campaign_id, impressions, cost_usd')
  .order('created_at', { ascending: false })
let { data, error } = await query
let hasDisplayOrder = true
if (error && /display_order/.test(error.message)) {
  hasDisplayOrder = false
  const retry = await sb
    .from('linkedin_campaigns')
    .select('id, campaign_name, pinned_at, created_at, linkedin_campaign_id, impressions, cost_usd')
    .order('created_at', { ascending: false })
  data = retry.data
  error = retry.error
}
if (error) { console.error('ERROR:', error.message); process.exit(1) }

console.log(`display_order column present: ${hasDisplayOrder}`)
console.log('Current state:')
for (const c of data ?? []) {
  const live = c.linkedin_campaign_id && /^\d+$/.test(c.linkedin_campaign_id) ? ' LIVE' : ''
  const order = hasDisplayOrder ? `display_order=${String(c.display_order ?? 'null').padEnd(5)}` : 'display_order=N/A'
  console.log(
    `  ${c.campaign_name.padEnd(48)}  pinned_at=${String(c.pinned_at ?? 'null').padEnd(30)}  ${order}${live}`
  )
}
