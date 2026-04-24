// Apply fresh Bayer numbers from the LinkedIn creative performance export:
//   C:\Users\asafb\Downloads\creative_1280406054_creative_performance_report (2).csv
// Report window: Jan 24 2026 → Apr 23 2026
//
//   Impressions: 14 → 19
//   Clicks:       0 →  0
//   Cost (USD):  $15.17 → $16.50
//   Leads:        0 →  0
//   Engagements: - →  2 (social reactions)
//
// We update the Bayer row matched by linkedin_campaign_id=690308904, which is
// the Ad Set ID in LinkedIn's hierarchy. The Campaign ID (1042212674) in the
// CSV is the parent and not stored anywhere in the DB.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const payload = {
  impressions: 19,
  clicks: 0,
  cost_usd: 16.50,
  leads: 0,
  updated_at: new Date().toISOString(),
}

const { data, error } = await sb
  .from('linkedin_campaigns')
  .update(payload)
  .eq('linkedin_campaign_id', '690308904')
  .select('id, campaign_name, impressions, clicks, cost_usd, leads, pinned_at, linkedin_campaign_id')

if (error) { console.error('ERROR:', error.message); process.exit(1) }
if (!data?.length) { console.error('No Bayer row matched linkedin_campaign_id=690308904'); process.exit(1) }

console.log('Updated Bayer campaign:')
for (const c of data) {
  console.log(`  ${c.campaign_name}`)
  console.log(`  linkedin_campaign_id=${c.linkedin_campaign_id}  pinned_at=${c.pinned_at ?? 'null'}`)
  console.log(`  impressions=${c.impressions}  clicks=${c.clicks}  cost_usd=${c.cost_usd}  leads=${c.leads}`)
}
