// Boston Scientific — LinkedIn post #2: recall-prevention angle.
//
// Brief: professional, industry-framed, indirect. Does NOT name Boston
// Scientific or any specific recall. Addresses the industry-wide pattern
// that every Class I manufacturing-defect recall traces back to a single
// deviation on a single line, caught weeks later — or never — from paper
// records. Positions Tulip's composable MES (DHR + Factory Playback +
// AI-assisted visual inspection) as the infrastructure that turns a
// reactive quality posture into a preventive one.
//
// Voice: declarative, specific, craft-respecting. Avoids:
//   - naming any manufacturer, recall, or injury count
//   - adjectives like "powerful" / "comprehensive" / "robust"
//   - stock-photo SaaS copy ("unlock the power of AI")
// Calls to action: concrete, low-friction — a 30-minute Factory Playback demo.
//
// Target accounts are set broadly across the medical device sector so the
// post reaches Boston Scientific alongside peers — not a 1-to-1 callout.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const bscId = '0b322ff0-0961-4d0e-b852-e8f2ae256c0e'

const campaign = {
  account_id: bscId,
  campaign_name: 'TulipABX — Boston Scientific — Medical Device Recall Prevention — April 2026',
  status: 'draft',
  objective: 'WEBSITE_VISITS',

  // LinkedIn Sponsored Content:
  //   Headline caps at ~200 chars (we aim for one short line)
  //   Introductory text caps at ~600 chars (we aim under 550 to leave
  //   whitespace — LinkedIn collapses long copy behind "see more" around 210)
  headline: "In medical device manufacturing, the difference between a recall and a catch is one shift of structured production data.",

  ad_copy:
    "Every Class I manufacturing-defect recall traces back to a single deviation on a single line — caught weeks later when paper records are reconstructed, or never.\n\n" +
    "Tulip is the composable MES for medical device operations: electronic DHRs generated as operators build, every step attributed and immutable. Factory Playback overlays time-synced video with production data on one timeline, so root-cause investigations collapse from days to the current shift. AI-assisted visual quality inspection catches defects at the station, not after packaging.\n\n" +
    "Built for 21 CFR Part 11 from day one. Deploys on one line first, templates to every plant by configuration.\n\n" +
    "A 30-minute Factory Playback walkthrough is worth a look before your next FDA inspection cycle.",

  // Broad medical-device targeting so Boston Scientific sees the post
  // alongside a roomful of peers — no single-account callout.
  target_companies: [
    'Boston Scientific',
    'Medtronic',
    'Abbott Laboratories',
    'Stryker',
    'Johnson & Johnson MedTech',
    'Edwards Lifesciences',
    'Becton Dickinson',
    'Zimmer Biomet',
    'Dentsply Sirona',
    'Baxter International',
  ],

  budget_usd: 500,
  impressions: 0,
  clicks: 0,
  leads: 0,
  cost_usd: 0,
  // Not pinned — Bayer keeps top spot
  pinned_at: null,
  display_order: null,
}

const { data, error } = await sb.from('linkedin_campaigns').insert(campaign).select('*').single()
if (error) { console.error('insert error:', error.message); process.exit(1) }

console.log('Boston Scientific LinkedIn campaign created.')
console.log(`  id:             ${data.id}`)
console.log(`  status:         ${data.status}`)
console.log(`  campaign_name:  ${data.campaign_name}`)
console.log(`  headline (${data.headline.length} chars): ${data.headline}`)
console.log(`  ad_copy (${data.ad_copy.length} chars)`)
console.log(`  target_companies: ${data.target_companies.length} (${data.target_companies.slice(0,3).join(', ')} + 7 more)`)
console.log(`  budget: $${data.budget_usd}`)
