// Apply newest Bayer LinkedIn Campaign Manager export (Apr 24 2026, 11:43 PM UTC):
//
//   CSV summed across 4/23 + 4/24 rows:
//     Impressions:        19 + 20 = 39
//     Clicks:              0 +  0 =  0
//     Total Engagements:   2 +  1 =  3
//     Total Spent:  $16.50 + $16.50 = $33.00
//   Engagement rate = 3 / 39 = 7.69% (computed, not stored)
//
// Requires the 2026-04-24_campaign_engagements migration to have been run
// first (adds total_engagements column on linkedin_campaigns).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const payload = {
  impressions: 39,
  clicks: 0,
  cost_usd: 33.00,
  leads: 0,
  total_engagements: 3,
  updated_at: new Date().toISOString(),
}

const { data, error } = await sb
  .from('linkedin_campaigns')
  .update(payload)
  .eq('linkedin_campaign_id', '690308904')
  .select('id, campaign_name, impressions, clicks, cost_usd, leads, total_engagements, pinned_at, linkedin_campaign_id')

if (error) {
  console.error('ERROR:', error.message)
  if (/total_engagements/.test(error.message)) {
    console.error('\nHint: run supabase/migrations/2026-04-24_campaign_engagements.sql first.')
  }
  process.exit(1)
}
if (!data?.length) { console.error('No Bayer row matched linkedin_campaign_id=690308904'); process.exit(1) }

for (const c of data) {
  const rate = c.impressions > 0 ? ((c.total_engagements / c.impressions) * 100).toFixed(2) : '0.00'
  console.log(`Updated ${c.campaign_name}`)
  console.log(`  linkedin_campaign_id=${c.linkedin_campaign_id}  pinned_at=${c.pinned_at ?? 'null'}`)
  console.log(`  impressions=${c.impressions}  clicks=${c.clicks}  engagements=${c.total_engagements}  engagement_rate=${rate}%  cost=$${c.cost_usd}  leads=${c.leads}`)
}
