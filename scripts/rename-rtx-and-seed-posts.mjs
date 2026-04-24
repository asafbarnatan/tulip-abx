// Three writes, one script:
//
//   1. Rename accounts.name from "RTX (Raytheon Technologies)" → "RTX".
//      Raytheon is a sub-business of RTX (since the 2020 UTC-Raytheon merger
//      that rebranded the parent as RTX in 2023). The parent company is RTX
//      full stop — Raytheon is one of three businesses underneath, alongside
//      Pratt & Whitney and Collins Aerospace. The parenthetical was wrong.
//
//   2. Seed a LinkedIn post for Thermo Fisher — pharma CIO / AI-data angle,
//      leans on Tulip MCP + AI Composer + eBR. Broad pharma-manufacturing
//      targeting so TF sees it alongside peers (not a single-account callout).
//
//   3. Seed a LinkedIn post for RTX — A&D / post-CMMC / FedRAMP angle,
//      leans on FedRAMP Moderate Equivalency + Tulip MCP + Factory Playback
//      + AI Composer. Broad defense-contractor targeting.
//
// Both posts written by me wearing the content-marketer hat (no LLM call).
// Voice: declarative, specific, craft-respecting. No banned adjectives,
// no stock-SaaS hype.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const rtxId = 'e049cc6b-ee3f-460f-bae8-330c9358de03'
const tfId  = '344983b4-4d3a-497e-bc6d-afd076c9ab39'

// -----------------------------------------------------------------------------
// 1. Rename RTX account
// -----------------------------------------------------------------------------
const { error: renameErr } = await sb.from('accounts').update({ name: 'RTX' }).eq('id', rtxId)
if (renameErr) { console.error('rename error:', renameErr.message); process.exit(1) }
console.log('Account renamed: RTX (Raytheon Technologies) → RTX')

// -----------------------------------------------------------------------------
// 2. Thermo Fisher LinkedIn post — pharma CIO / AI-data pipeline angle
// -----------------------------------------------------------------------------
const tfCampaign = {
  account_id: tfId,
  campaign_name: 'TulipABX — Thermo Fisher Scientific — Plant-floor AI data pipeline — April 2026',
  status: 'draft',
  objective: 'WEBSITE_VISITS',

  // Headline anchored on the CIO frustration — their OpenAI/Anthropic strategy
  // is bottlenecked by the data that never makes it off the plant floor.
  headline: "The data that feeds your AI strategy lives on the plant floor. The question is whether it can get out.",

  ad_copy:
    "Every CIO embedding AI into pharma manufacturing hits the same wall: the models need structured plant-floor data at the resolution paper records and batch MES exports can't produce. Operator actions. In-process measurements. Deviation context. Time-synced with the production cycle.\n\n" +
    "Tulip is the composable MES that generates that data as a byproduct of guided assembly and eBR. Tulip MCP exposes it directly to your AI stack via the Model Context Protocol — queryable by any agent, no nightly pipeline, no CSV exports. AI Composer scaffolds the first work-instruction app from plain-language intent. Frontline Copilot supports operators inline. 21 CFR Part 11-compliant by design.\n\n" +
    "Pharma CIOs rethinking their plant-floor-to-AI pipeline: a 30-minute Tulip MCP walkthrough is worth a look.",

  // Broad pharma / biopharma / CDMO targeting so TF sees it alongside peers.
  target_companies: [
    'Thermo Fisher Scientific',
    'Moderna',
    'Lonza',
    'Catalent',
    'WuXi Biologics',
    'Samsung Biologics',
    'Boehringer Ingelheim',
    'Novartis',
    'Merck KGaA',
    'Pfizer',
  ],

  budget_usd: 500,
  impressions: 0, clicks: 0, leads: 0, cost_usd: 0,
  pinned_at: null,
  display_order: null,
}

// -----------------------------------------------------------------------------
// 3. RTX LinkedIn post — post-CMMC / FedRAMP / digital-thread angle
// -----------------------------------------------------------------------------
const rtxCampaign = {
  account_id: rtxId,
  campaign_name: 'TulipABX — RTX — Post-CMMC 2.0 audit readiness — April 2026',
  status: 'draft',
  objective: 'WEBSITE_VISITS',

  // CMMC 2.0 is the forcing function — in force since Nov 10, 2025, which is
  // ~5½ months ago as of today. Every A&D CIO has this on their radar.
  headline: "CMMC 2.0 has been in force since November 2025. How many of your DFARS contracts can produce the audit trail on demand?",

  ad_copy:
    "CMMC 2.0 has been in force since November 10, 2025. Every DFARS contract now carries a traceability requirement that paper travelers and spreadsheet-stitched records cannot satisfy at audit speed.\n\n" +
    "Tulip is the composable MES for aerospace and defense production — FedRAMP Moderate Equivalency already in place, clearing deployment on CUI-scope DoD programs. It generates AS9100-scope audit trails as operators build, not reconstructed weeks later. Tulip MCP exposes that data directly to enterprise digital-thread and compliance agents. Factory Playback collapses MRB investigations from days to hours. AI Composer lets process engineers scaffold work-instruction apps from plain-language intent — no 18-month IT build cycle.\n\n" +
    "A&D CIOs: worth a look before the next DCMA audit.",

  // Broad defense-contractor targeting — RTX sees it alongside the other
  // primes and the tier-1 suppliers that sit in the same CMMC scope.
  target_companies: [
    'RTX',
    'Lockheed Martin',
    'Northrop Grumman',
    'General Dynamics',
    'L3Harris Technologies',
    'Boeing Defense, Space & Security',
    'GE Aerospace',
    'Textron',
    'BAE Systems',
    'Leidos',
  ],

  budget_usd: 500,
  impressions: 0, clicks: 0, leads: 0, cost_usd: 0,
  pinned_at: null,
  display_order: null,
}

const { data: tfRow, error: tfErr } = await sb.from('linkedin_campaigns').insert(tfCampaign).select('*').single()
if (tfErr) { console.error('TF campaign insert error:', tfErr.message); process.exit(1) }
console.log('Thermo Fisher LinkedIn campaign drafted:')
console.log(`  id:             ${tfRow.id}`)
console.log(`  headline (${tfRow.headline.length} chars): ${tfRow.headline}`)
console.log(`  ad_copy:        ${tfRow.ad_copy.length} chars`)
console.log(`  target count:   ${tfRow.target_companies.length}`)

const { data: rtxRow, error: rtxErr } = await sb.from('linkedin_campaigns').insert(rtxCampaign).select('*').single()
if (rtxErr) { console.error('RTX campaign insert error:', rtxErr.message); process.exit(1) }
console.log('')
console.log('RTX LinkedIn campaign drafted:')
console.log(`  id:             ${rtxRow.id}`)
console.log(`  headline (${rtxRow.headline.length} chars): ${rtxRow.headline}`)
console.log(`  ad_copy:        ${rtxRow.ad_copy.length} chars`)
console.log(`  target count:   ${rtxRow.target_companies.length}`)

// Verify RTX is now named correctly
const { data: rtxVerify } = await sb.from('accounts').select('name').eq('id', rtxId).single()
console.log('')
console.log(`RTX account name is now: "${rtxVerify.name}"`)
