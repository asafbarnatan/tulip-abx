// Apply newest Bayer LinkedIn Campaign Manager export (Apr 25 2026, 3:42 PM UTC):
//
//   CSV summed across 4/23 + 4/24 + 4/25 daily rows (final, campaign closed):
//     Impressions:        19 + 20 +  7 = 46
//     Clicks:              0 +  0 +  0 =  0
//     Total Engagements:   2 +  1 +  1 =  4
//     Total Spent:  $16.50 + $16.50 + $11.00 = $44.00 (full budget consumed)
//   Engagement rate = 4 / 46 = 8.70% (computed, not stored)
//   Ad Set Status (LinkedIn): Completed — campaign window closed 4/25.
//
// Requires the 2026-04-24_campaign_engagements migration to have been run
// first (adds total_engagements column on linkedin_campaigns).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const payload = {
  impressions: 46,
  clicks: 0,
  cost_usd: 44.00,
  leads: 0,
  total_engagements: 4,
  status: 'completed',
  updated_at: new Date().toISOString(),
}

const { data, error } = await sb
  .from('linkedin_campaigns')
  .update(payload)
  .eq('linkedin_campaign_id', '690308904')
  .select('id, campaign_name, impressions, clicks, cost_usd, leads, total_engagements, status, pinned_at, linkedin_campaign_id')

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
  console.log(`  linkedin_campaign_id=${c.linkedin_campaign_id}  pinned_at=${c.pinned_at ?? 'null'}  status=${c.status}`)
  console.log(`  impressions=${c.impressions}  clicks=${c.clicks}  engagements=${c.total_engagements}  engagement_rate=${rate}%  cost=$${c.cost_usd}  leads=${c.leads}`)
}
