// Apply newest Bayer LinkedIn Campaign Manager numbers (Apr 23 2026 snapshot):
//
//   Impressions:        39
//   Clicks:              0
//   Total engagement:    3
//   Engagement rate:   7.69%   ← computed on the fly (3 / 39 * 100)
//
// Engagement rate is NOT stored — /api/kpis derives it from
// total_engagements / impressions so it always matches the two inputs.
//
// Requires the 2026-04-24_campaign_engagements migration to have been run
// first (adds total_engagements column on linkedin_campaigns).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const payload = {
  impressions: 39,
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
