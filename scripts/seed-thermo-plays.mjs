// Seed 3 custom plays for Thermo Fisher Scientific — hand-written, no LLM.
//
// Each play is grounded in publicly-verified facts surfaced during the brief
// review:
//   - Vaxcyte $1B fill-finish commitment (Pharma Manufacturing, Oct 2025)
//   - Sanofi Ridgefield NJ acquisition closed Sep 2, 2025
//   - Ryan Snyder's three-pillar AI strategy (Metis Strategy interview)
//   - 4 × 5,000L SUBs Lengnau + 4 × 2,000L St. Louis coming online 2025
//   - Bioprocess Design Centers in Hyderabad / Incheon / Singapore
// And each leans on a DIFFERENT Tulip AI feature to avoid proof-point overlap:
//   Play 1 → Factory Playback + Frontline Copilot + AI-assisted visual QI
//   Play 2 → Tulip MCP + AI Insights
//   Play 3 → AI App Translation + AI Composer
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const tfId = '344983b4-4d3a-497e-bc6d-afd076c9ab39'  // Thermo Fisher Scientific

const plays = [
  // -------------------------------------------------------------------------
  // Play 1 — Ridgefield eBR Pilot for Vaxcyte Line Qualification
  // Target: Mike Shafer, EVP Biopharma Services
  // Owner: sales / demo / 30 days
  // Leans on: Factory Playback + Frontline Copilot + AI-assisted visual QI
  // -------------------------------------------------------------------------
  {
    account_id: tfId,
    name: 'Ridgefield eBR Pilot — Vaxcyte Line Qualification Sprint',
    description: "Stand up a validated electronic batch record pilot on one Ridgefield fill-finish line before the Vaxcyte $1B commercial qualification window closes. Pilot scope: one line, one product, 60-day validation cycle, operator-built apps with Frontline Copilot inline support and Factory Playback for real-time deviation root-cause. Target owner is Mike Shafer — the Sanofi integration + Vaxcyte timeline land on his desk simultaneously.",
    play_type: 'demo',
    owner_team: 'sales',
    duration_days: 30,
    sample_outreach_opener: "Mike, the Vaxcyte $1B fill-finish commitment and the Sanofi Ridgefield integration are both fighting for the same capacity and the same 60-90 day qualification window. The path with the lowest risk is a single validated eBR pilot on one Ridgefield fill-finish line that produces the ALCOA+ audit trail and AI-assisted visual quality data the Vaxcyte program needs — with Frontline Copilot supporting the 200+ Sanofi operators inline through every batch step. I'd like to walk you through a 30-day pilot scope where your process engineers build the apps themselves. Does a 30-minute call with your Ridgefield qualification lead work this week?",
    expected_outcome: 'Discovery call with Ridgefield qualification lead scheduled within 10 days; 30-day eBR pilot scope agreed; first Tulip-built batch record running before Vaxcyte qualification deadline.',
    assets: [
      'Vaxcyte fill-finish line qualification checklist (Tulip)',
      '21 CFR Part 11 + ALCOA+ validation architecture brief',
      'Factory Playback + AI Trigger Descriptions demo environment',
      'Frontline Copilot operator-inline-support one-pager',
      'Tulip + Somerville MA / Waltham MA deployment playbook (15mi HQ proximity)',
    ],
    created_by_name: 'Asaf Bar Natan',
    created_by_role: 'AE',
  },

  // -------------------------------------------------------------------------
  // Play 2 — CIO Champion Thread: Tulip MCP into the 3-Pillar AI Strategy
  // Target: Ryan Snyder, SVP & CIO
  // Owner: sales / exec / 14 days
  // Leans on: Tulip MCP + AI Insights
  // -------------------------------------------------------------------------
  {
    account_id: tfId,
    name: 'CIO Thread — Tulip MCP Into the Three-Pillar AI Strategy',
    description: "Position Tulip as the structured plant-floor data layer feeding Ryan Snyder's publicly-stated three-pillar AI strategy (operational efficiency · product & service enhancement · customer experience). OpenAI collaboration is the prestige tactic; Tulip MCP is the data-availability substrate that makes it work at manufacturing resolution. AI Insights surfaces the operator + cycle-time data directly into his operational-efficiency pillar dashboards.",
    play_type: 'exec',
    owner_team: 'sales',
    duration_days: 14,
    sample_outreach_opener: "Ryan, your three-pillar AI strategy and OpenAI collaboration will only land on the operational-efficiency pillar if your models have structured plant-floor data at a resolution paper records and legacy MES batch exports don't produce. Tulip MCP exposes guided-assembly, eBR, and deviation data directly to your AI stack through the Model Context Protocol — the same data substrate, queryable by any agent. AI Insights pairs with it so your plant managers see the operational-efficiency KPIs in dashboards you can show your BoD. I'd like a 45-minute architecture session with your IT/OT team. Does next Tuesday or Wednesday work?",
    expected_outcome: 'Architecture deep-dive with Snyder + IT/OT leads scheduled within 14 days; Tulip MCP evaluation against OpenAI integration roadmap; explicit CIO sponsorship for the Ridgefield pilot.',
    assets: [
      'Tulip MCP technical brief + architecture diagram',
      'AI Insights dashboards — operational-efficiency pillar (demo env)',
      'Metis Strategy interview — Three-Pillar AI Strategy (reference)',
      'OpenAI + Tulip integration reference (plant-floor data substrate)',
      'Fortune 500 pharma customer — 78% changeover time reduction case study',
    ],
    created_by_name: 'Asaf Bar Natan',
    created_by_role: 'AE',
  },

  // -------------------------------------------------------------------------
  // Play 3 — Multi-Site Bioreactor Standardization Workshop
  // Target: Daniella Cramp, SVP & President, BioProduction
  // Owner: marketing / event / 21 days
  // Leans on: AI App Translation + AI Composer
  // -------------------------------------------------------------------------
  {
    account_id: tfId,
    name: 'Multi-Site Bioreactor Standardization Workshop — Lengnau, St. Louis, Asia Design Centers',
    description: "Joint Tulip + Thermo Fisher BioProduction workshop on composable-MES patterns for the 4 × 5,000L SUBs at Lengnau + 4 × 2,000L at St. Louis coming online in 2025, with AI App Translation handling localization across the Hyderabad, Incheon, and Singapore Design Centers. Format: 2-day in-person at Lengnau OR virtual across all regions. Gets Daniella's process engineers hands-on with AI Composer building bioreactor startup apps in plain-language from day one.",
    play_type: 'event',
    owner_team: 'marketing',
    duration_days: 21,
    sample_outreach_opener: "Daniella, 4 × 5,000L SUBs coming online at Lengnau + 4 × 2,000L at St. Louis, plus the new Hyderabad Bioprocess Design Center and the expanded Incheon and Singapore centers — that's one of the most acute multi-site standardization problems in BioProduction. Every new site that starts up on tribal knowledge is a 2-year retrofit debt. Tulip's running a workshop for BioProduction leaders on composable-MES patterns where AI App Translation localizes the same validated bioreactor startup app across every plant language, and AI Composer scaffolds new apps from plain-language intent so your process engineers build them in a single kaizen cycle. Your J&J Biosense Webster operations experience is exactly the lens this workshop is designed for. Would your team send 2-3 process-engineering leads?",
    expected_outcome: 'Two or more BioProduction leaders attend; post-workshop discovery call with Daniella\'s team scheduled; one Lengnau or St. Louis bioreactor startup app prototyped during the workshop.',
    assets: [
      'Workshop agenda — composable MES for bioreactor startups (2-day, localized)',
      'AI App Translation demo — Lengnau German / Singapore / Hyderabad / Korea localization',
      'AI Composer hands-on lab — plain-language bioreactor SOP → validated app',
      'Fortune 500 pharma customer reference — 78% changeover time reduction',
      'BioProduction multi-site deployment playbook (Lengnau / St. Louis / Asia)',
    ],
    created_by_name: 'Asaf Bar Natan',
    created_by_role: 'Marketing',
  },
]

// Insert all 3 in one batch to keep created_at ordering consistent.
const { data, error } = await sb.from('custom_plays').insert(plays).select('*')
if (error) { console.error('insert error:', error.message); process.exit(1) }

console.log(`Inserted ${data.length} custom plays for Thermo Fisher:`)
for (const p of data) {
  console.log(`  [${p.play_type}/${p.owner_team}/${p.duration_days}d] ${p.name}`)
  console.log(`     id: ${p.id}`)
}
