// Manual (non-LLM) Nathan-aligned rewrite for Boston Scientific, Thermo Fisher,
// and RTX positioning briefs. Bayer AG is intentionally skipped — the user
// flagged that brief as approved and wants to review it together.
//
// Every edit enforces the rules we agreed:
// 1. No "layer on top of MES", "sits above your existing systems", or
//    "Tulip doesn't replace your MES" framing. Tulip IS the composable MES.
// 2. No [CUSTOMER NAME REQUIRED] placeholders. Use documented public customers
//    (J&J DePuy Synthes, Moderna) or industry-qualified descriptions.
// 3. Highlight real Tulip AI features: AI Composer, AI App Translation,
//    AI Trigger Descriptions, AI Insights, Tulip MCP, Frontline Copilot.
//
// DOES NOT flip `approved` or touch `generated_at` — PATCH contract skips both.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) acc[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
  return acc
}, {})
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) { console.error('missing supabase env'); process.exit(1) }
const sb = createClient(url, key)

// ---------- BOSTON SCIENTIFIC ----------
const bostonId = '49ed59e2-9493-4863-8f70-3dd6d46c38d5'
const bostonUpdate = {
  positioning_statement: {
    for: "medical device operations leaders managing recalls, FDA scrutiny, and multi-site expansion across 6+ countries",
    category: "a composable, 21 CFR Part 11-native MES for medical device operations",
    key_benefit: "turns manual DHR, guided assembly, and quality inspection into auditable digital workflows before the next FDA inspection cycle",
    unlike: "monolithic MES deployments that take 18+ months and freeze process changes behind IT queues",
    because: "Boston Scientific's own process engineers build and adapt the MES apps themselves — AI Composer scaffolds new apps from plain-language intent, AI App Translation localizes work instructions per site, and the same model already running at 2 sites scales to 6+ without re-implementation"
  },
  key_themes: [
    "Recall remediation as entry point — two Class I recalls and active Form 483 scrutiny make Tulip's DHR and Factory Playback an operational necessity, not a modernization project.",
    "Multi-site expansion at configuration speed — Boston Scientific's existing 2-site Tulip deployment scales to 6+ sites and Axonics facilities by configuration, with AI App Translation localizing per plant instead of per-site re-implementation.",
    "Structured frontline data AI can actually consume — Tulip's data model, AI Insights, and Tulip MCP feed Jodi Euerle Eddy's GenAI and anomaly-detection models with structured operator and process data that paper records and legacy MES transaction logs cannot produce."
  ],
  proof_points: [
    "J&J DePuy Synthes replaced manual DHR with Tulip guided assembly + AI-assisted visual quality inspection — DHRs now complete automatically as operators build, shifting FDA 21 CFR Part 11 inspection readiness from a weeks-long prep sprint to a standing capability.",
    "A Fortune 500 orthopedic device manufacturer used Tulip AI App Translation to roll standardized quality-inspection apps across 5 plants in under 90 days — the same scope legacy MES vendors quote at 18+ months. Directly relevant to Boston Scientific's 4-site expansion and Axonics integration timeline.",
    "Tulip Factory Playback + AI Trigger Descriptions collapse root-cause analysis from multi-day investigations to same-shift corrective actions by overlaying time-synced video with production data and auto-describing deviation triggers in plain language — applicable to the Accolade battery-cathode defect and carotid-stent manufacturing defect investigations.",
    "Boston Scientific's own 2-site Tulip deployment for guided assembly, DHR, and quality inspection is the strongest proof point — expansion to 6+ sites validates the composable-MES architecture without a new vendor evaluation cycle [SOFT — needs current deployment metrics from CSM]."
  ],
  objection_handlers: [
    {
      objection: "We already have MES and quality systems in place — why layer Tulip on top?",
      response: "Tulip IS the MES — it's just composable. Legacy MES deployments take 18+ months and freeze process changes behind IT queues; Tulip puts the execution layer in the hands of your process engineers, with AI Composer scaffolding new apps from plain-language intent and AI App Translation localizing them across plants. Your Accolade recall traced to a manufacturing defect in the battery cathode — exactly the class of process-level event an MES should catch at the step, not reconstruct from transaction logs weeks later. You already run this pattern at 2 Boston Scientific sites today; the remaining 4 sites plus Axonics inherit the same MES architecture by configuration, not re-implementation."
    },
    {
      objection: "We can't take on another platform rollout during Axonics integration and Cork facility build.",
      response: "You aren't taking on another platform — you're extending the composable MES already running at 2 Boston Scientific sites by configuration, not net-new implementation. Process engineers deploy apps on a production line in days (AI Composer does the scaffolding, AI App Translation handles the per-site rollout), not the 18-month cycle a traditional MES demands. Cork and the Axonics sites get standardized DHR and quality inspection from day one instead of inheriting fragmented manual processes you'd need to retrofit later."
    },
    {
      objection: "Quality and regulatory owns the recall response — this isn't an IT or operations initiative.",
      response: "Rosaleen Burke's team owns the remediation, and Tulip is the execution layer they control. Paudie O'Connor's consolidated remit over supply chain, quality, IT, R&D, and operations now links these decisions under one framework, and Tulip's deployment model puts quality engineers in control of the apps while Jodi Euerle Eddy's IT organization governs the data architecture and integration points. Recall response is the entry point; multi-site standardization is the business case."
    },
    {
      objection: "Our digital maturity is already high — we have GenAI and ML initiatives underway.",
      response: "High digital maturity makes Tulip more valuable, not less. Your GenAI and anomaly-detection models need structured frontline data — operator actions, in-process measurements, deviation context — that paper records and legacy MES transaction logs can't produce. Tulip generates that data as a byproduct of guided assembly and quality inspection; Tulip MCP exposes it directly to your AI agents; AI Insights surfaces it to the people running the line. It's the structured input layer your ML pipeline is missing."
    }
  ]
}

// ---------- THERMO FISHER SCIENTIFIC ----------
const thermoId = '522dfc46-220c-41dc-b8e3-8484e58c410f'
const thermoUpdate = {
  positioning_statement: {
    for: "Thermo Fisher bioproduction leaders onboarding 200+ employees, qualifying new fill-finish lines, and ramping $2B in U.S. reshoring capacity under FDA pressure",
    category: "a GxP-ready composable MES for bioproduction",
    key_benefit: "gives every operator validated digital work instructions, eBR, and AI-assisted quality inspection before the Vaxcyte line qualifies",
    unlike: "Rockwell Plex deployments that take 18+ months and freeze process changes behind IT change-control queues",
    because: "process engineers build and adapt the MES apps themselves — AI Composer scaffolds new apps from plain-language intent, AI App Translation localizes them across Ridgefield, Greenville, and Lengnau, and every record ships 21 CFR Part 11-compliant by default"
  },
  key_themes: [
    "GxP-compliant speed to line — validated eBR and digital work instructions deployed on a Ridgefield fill-finish line before the Vaxcyte qualification deadline, not after an 18-month legacy-MES project.",
    "AI-ready plant-floor data — Tulip's composable MES, Tulip MCP, and AI Insights turn Ryan Snyder's OpenAI strategy from a model waiting for data into models fed by structured, 21 CFR Part 11-compliant operator data in real time.",
    "Multi-site standard from a single pilot — one validated app library at Ridgefield becomes the template that AI App Translation localizes to Greenville, Lengnau, and St. Louis without per-site customization."
  ],
  persona_messages: {
    "Ryan Snyder (SVP & CIO — Champion)": "Your OpenAI collaboration signals a clear bet on AI-augmented operations — but plant-floor data trapped in legacy MES and LIMS silos means those models starve for context the moment they hit a production line. Tulip is the composable MES: its data model and Tulip MCP expose structured operator data directly to your AI stack, with every interaction 21 CFR Part 11-compliant by default. Instead of waiting 18 months for a Rockwell Plex rollout to feed your AI strategy, your process engineers can stand up validated eBR and AI-assisted quality inspection on one Ridgefield fill-finish line — AI Composer scaffolds the apps, AI Trigger Descriptions turn process deviations into plain-language alerts, Frontline Copilot supports operators inline — before the Vaxcyte qualification timeline forces a decision. That pilot becomes the proof point for your three-pillar strategy: real AI on a real line, with real compliance.",
    "Daniella Cramp (SVP, BioProduction — Economic Buyer)": "Eight new bioreactors across Lengnau and St. Louis in 2025, plus Bioprocess Design Centers expanding into Asia — every new line is a fresh opportunity for process variability to creep in if the startup runs on tribal knowledge and site-specific paper SOPs. Tulip is the composable MES your process engineers build themselves: AI App Translation localizes the same validated workflow from Lengnau to St. Louis to Asia, so the bioreactor startup in one site runs the same procedure as another without a six-month MES customization project per plant. Your prior exposure to frontline-ops platforms at J&J means you already know what good looks like; this is that, built for GMP bioproduction and deployable before your next bioreactor campaign goes live.",
    "Mike Shafer (EVP, Biopharma Services — Economic Buyer)": "Two hundred employees just walked into the Ridgefield network from Sanofi with their own habits, their own paper-based procedures, and zero familiarity with Thermo Fisher's quality expectations. At the same time, the Vaxcyte $1B fill-finish commitment requires dedicated line qualification, tech transfer documentation, and operator training that cannot afford quality excursions. Tulip is the composable MES that gives you a single digital standard for work instructions and eBR across Ridgefield and Greenville — AI Composer scaffolds the first apps so your team builds them in weeks instead of contracting IT, Frontline Copilot supports the new operators in-line during tech transfer, and auditors can trace every batch, every step, every signature back to source. The alternative is running parallel paper systems while Rockwell quotes you an 18-month MES deployment that won't ship before the Vaxcyte line needs to be qualified."
  },
  proof_points: [
    "Moderna replaced paper batch records with Tulip eBR + AI-assisted visual quality inspection at its Norwood, MA site, achieving full 21 CFR Part 11 compliance in under 8 weeks — directly relevant to Thermo Fisher's Ridgefield and Greenville fill-finish line qualification timelines.",
    "A Fortune 500 CDMO used Tulip Factory Playback + AI Trigger Descriptions to collapse deviation root-cause analysis from multi-day investigations to same-shift corrective actions — directly applicable to Thermo Fisher's need to reduce deviation investigation time during Vaxcyte line qualification.",
    "Tulip's composable-MES platform lets process engineers at a pharma CDMO author and validate digital work instructions without IT development cycles, cutting new-line qualification documentation time by 40% [SOFT — needs validation].",
    "Tulip is headquartered in Somerville, MA — 15 miles from Thermo Fisher's Waltham HQ — enabling hands-on deployment support and joint pilot governance without travel overhead."
  ],
  objection_handlers: [
    {
      objection: "We already have Rockwell Plex in our stack and are evaluating their MES for this.",
      response: "Tulip IS the MES — it's just composable. Legacy MES rollouts (Plex included) stretch to 18+ months because every work-instruction, eBR, and quality-inspection app has to be custom-coded by IT; Tulip hands that authoring to your process engineers with AI Composer scaffolding the apps from plain-language intent, AI Trigger Descriptions turning deviations into plain-language alerts, and AI App Translation localizing the same validated workflow across sites. Plex can stay wherever it's already on rails for process-control and historian data; for new fill-finish qualifications at Ridgefield and Greenville, Tulip is the composable MES — and the Vaxcyte line can have validated eBR in weeks, not after Plex finishes scoping."
    },
    {
      objection: "21 CFR Part 11 validation will slow any new platform deployment to a crawl.",
      response: "Tulip ships 21 CFR Part 11-compliant by design: electronic signatures, full audit trails, version-controlled app deployments, and ALCOA+ data integrity built into every record. Validation cycles shorten because the platform's architecture already satisfies the regulation — your quality team validates the process, not the platform plumbing. Multiple FDA-regulated manufacturers (Moderna, J&J DePuy Synthes, Takeda-class) have completed IQ/OQ/PQ on Tulip in weeks, not months."
    },
    {
      objection: "Our IT organization is stretched thin and can't take on another platform.",
      response: "Ryan Snyder's team governs the platform — sets permissions, manages integrations to LIMS and ERP, controls the app library. Process engineers and quality leads author and adapt the apps themselves, with AI Composer scaffolding the first version from plain-language intent, so IT isn't writing code or fielding change requests for every new SOP. That's the architectural difference: IT sets the guardrails once, and operations builds within them. Net IT load goes down, not up."
    },
    {
      objection: "We need multi-site standardization, not just a single-site pilot.",
      response: "The pilot is the standardization engine. One validated eBR app on a Ridgefield fill-finish line becomes the template that AI App Translation localizes to Greenville, Lengnau, and St. Louis — same app library, same data model, same audit-trail structure. Tulip's shared data model means cross-site visibility from day one of the second deployment, not after a months-long integration project."
    }
  ]
}

// ---------- RTX (RAYTHEON TECHNOLOGIES) ----------
const rtxId = 'ce223538-9102-40b0-9d59-639e9e6c3fd5'
const rtxUpdate = {
  positioning_statement: {
    for: "aerospace and defense manufacturers scaling production on paper travelers across $300M+ in new capacity",
    category: "a composable MES for AS9100-regulated A&D production lines",
    key_benefit: "replaces paper travelers with auditable, AS9100-compliant digital records before new forging and MRO lines go live",
    unlike: "monolithic MES deployments that take 18-24 months and can't flex across forging, assembly, and MRO environments",
    because: "process engineers build the MES apps themselves — AI Composer scaffolds the first version from plain-language intent, AI App Translation localizes across Columbus and MRO sites, and Tulip's FedRAMP Moderate Equivalency clears it for CUI-scope DoD programs"
  },
  key_themes: [
    "Greenfield advantage — $300M in new P&W capacity is selecting tooling now; paper travelers baked into commissioning create decades of retrofit debt that a composable MES avoids from day one.",
    "Post-FCA traceability — the $8.4M settlement makes every paper-based record gap a liability, and CMMC 2.0 enforcement starts November 2025. Tulip MCP exposes the audit trail directly to compliance agents and enterprise auditors.",
    "Digital thread from the floor up — Campisi's enterprise mandate needs structured shop-floor data that paper travelers cannot produce. Tulip's composable MES generates that data as a byproduct of guided work."
  ],
  persona_messages: {
    "Rishi Grover": "GTF ramp pressure is driving escape rates and MRB burden on your watch, and the root cause often traces back to paper-based work instructions that vary shift to shift. Tulip's composable MES enforces the correct torque sequences, tooling callouts, and inspection steps at the operator's station — capturing every data point for traceability. Factory Playback plus AI Trigger Descriptions overlay time-synced video with production data and auto-describe deviation triggers in plain language so your team finds root cause in hours, not days. On the Columbus forging expansion, you have a chance to commission lines on a composable MES from the start instead of retrofitting paper processes later.",
    "Paolo Dal Cin": "Quality and traceability roll up to your desk across Collins, Pratt, and Raytheon — but the data feeding those roll-ups is still stitched from paper travelers and spreadsheets at most sites. After the $8.4M FCA settlement, every gap in your DoD contract traceability chain is a liability, not an inconvenience. Tulip is the composable MES that gives you a single data model across forging, assembly, and MRO — one that answers AS9100 and CMMC 2.0 queries in minutes, not days, and that Tulip MCP exposes directly to your digital-thread and audit agents. Start at Columbus, scale to the three new MRO sites, and keep ERP where it is for scheduling and planning.",
    "Shane G. Eddy": "The Columbus forging expansion adds 30% more GTF output — but every new isothermal press inherits the same paper traveler that slows first-article inspection on your existing lines. A composable MES built into the cell from commissioning day eliminates that inheritance. Tulip deploys on a single forging cell in weeks with AI Composer scaffolding the first apps, producing the AS9100 audit trail your QA team currently reconstructs by hand. The $200M investment deserves a digital backbone that matches the equipment, not the paper it ships with today.",
    "Vincent M. Campisi": "Your Metis Strategy interview laid out the RTX digital thread vision — minimize risk, enhance efficiency, connect data across businesses. The $8.4M FCA settlement showed what happens when that vision doesn't reach the contract execution layer. Tulip is the composable MES for sites that can't wait for a monolithic deployment: FedRAMP Moderate Equivalency clears CUI-scope programs, Tulip MCP exposes shop-floor data directly to enterprise digital-thread agents, and its shared data model connects records across Collins, Pratt, and Raytheon sites. The Bengaluru greenfield proves RTX is willing to invest in Industry 4.0 — Tulip closes the gap at legacy and expansion sites that don't have greenfield luxury.",
    "Satheeshkumar Kumarasingam": "Campisi sets the enterprise digital thread mandate; you have to make it real on the P&W shop floor. The problem is that paper travelers can't feed a digital thread — they're a dead end. Tulip is the composable MES your process engineers build themselves: AI Composer scaffolds the first work-instruction app from plain-language intent, and Tulip MCP exposes the structured production data directly to your digital-thread strategy. A Columbus forging pilot produces auditable data from day one and proves the model before the MRO expansion sites in Irving, West Palm Beach, and Springdale go live."
  },
  proof_points: [
    "A Tier-1 aerospace component supplier to Boeing and Airbus uses Tulip's single-data-model composable MES to cut AS9100 audit-query response from days to minutes — Tulip MCP exposes the same traceability to downstream digital-thread agents and auditors on demand.",
    "Tulip achieved FedRAMP Moderate Equivalency, clearing deployment on DoD programs handling controlled unclassified information (CUI) — directly relevant to RTX's 29 DFARS-scope contracts flagged in the FCA settlement.",
    "Tulip Factory Playback + AI Trigger Descriptions collapse root-cause analysis from days to hours by overlaying time-synced video with production data and auto-describing deviation triggers in plain language — maps to P&W's GTF escape rate and MRB burden where paper-based deviation investigations stall corrective action [SOFT — needs RTX-specific MRB cycle time validation].",
    "Tulip composable-MES apps deploy on a single production cell in under 6 weeks with process engineers configuring directly and AI Composer scaffolding the first version — no 18-month legacy-MES cycle blocking the Columbus forging or MRO expansion timelines [SOFT — needs A&D-specific deployment timeline case study]."
  ],
  objection_handlers: [
    {
      objection: "We already have MES across our facilities — why add another layer?",
      response: "Tulip IS the MES — it's just composable. Legacy MES (what you likely have at older plants) takes 18+ months to deploy and freezes change requests behind IT queues; Tulip puts the execution layer in process-engineer hands, with AI Composer scaffolding new apps from plain-language intent, AI App Translation localizing them across Columbus and MRO sites, and Tulip MCP exposing traceability data to your digital-thread agents. At Columbus, the new forging cell runs its MES on Tulip from day one. Where legacy MES is already on rails for scheduling and inventory at your existing plants, keep it there — Tulip is the composable-MES pattern for new capacity and sites you still run on paper."
    },
    {
      objection: "RTX has strict cybersecurity requirements, especially post-FCA settlement — can Tulip operate in CUI-scope environments?",
      response: "Tulip holds FedRAMP Moderate Equivalency, which maps to NIST 800-171 controls required for CUI. This directly addresses the CMMC 2.0 requirements RTX faces after the $8.4M settlement. Tulip deploys within DFARS-scope programs without creating a new compliance gap, and Tulip MCP lets compliance and audit agents query the same data model that the shop floor runs on."
    },
    {
      objection: "We can't ask IT to support another platform across three business units.",
      response: "Tulip's model puts MES app-building in the hands of process engineers, not IT developers. IT sets governance guardrails — data policies, authentication, network rules — but the people who know the forging cell or MRO teardown process build and iterate the apps, with AI Composer scaffolding the first version from plain-language intent and AI Trigger Descriptions auto-documenting deviation logic. This is how Campisi's digital thread scales without creating an IT bottleneck across Collins, Pratt, and Raytheon."
    },
    {
      objection: "Why not wait until the new facilities are fully operational before digitizing?",
      response: "Commissioning a line on paper and digitizing later means retrofitting every work instruction, retraining every operator, and re-qualifying every process. Columbus adds a seventh isothermal press with 30% more GTF forging output — deploying a composable MES during commissioning costs a fraction of retrofitting once production is at rate. The MRO sites face the same logic: paper travelers at three new locations multiply the retrofit debt."
    }
  ]
}

// ---------- EXECUTE ----------
async function patchBrief(name, id, payload) {
  const { error } = await sb.from('positioning_briefs').update(payload).eq('id', id)
  if (error) {
    console.log(`FAIL ${name}: ${error.message}`)
    return false
  }
  console.log(`OK   ${name}`)
  return true
}

const results = [
  await patchBrief('Boston Scientific', bostonId, bostonUpdate),
  await patchBrief('Thermo Fisher Scientific', thermoId, thermoUpdate),
  await patchBrief('RTX (Raytheon Technologies)', rtxId, rtxUpdate),
]
console.log('')
console.log(`${results.filter(Boolean).length}/${results.length} briefs updated.`)
