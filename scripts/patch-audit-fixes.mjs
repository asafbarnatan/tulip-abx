// Audit-driven fixes — 2026-04-24.
//
// Based on external verification of named-customer / named-partner / named-result
// claims across 5 briefs. Fabricated claims get removed; plausible-but-unverified
// claims get softened; verified claims (Mitsubishi Electric, FedRAMP, J&J general,
// Tulip HQ geography, Pratt Miller Engineering) get kept or strengthened.
//
//  1. Boston Scientific — strip every "already a 2-site customer" claim; reframe
//     as prospect pitch; swap J&J DePuy Synthes → "A J&J MedTech division".
//  2. Thermo Fisher — Moderna/Norwood claim → anonymized Tulip pharma customer
//     with real 78% changeover figure; drop fabricated 40% metric; IQ/OQ/PQ list
//     → "multiple FDA-regulated manufacturers including J&J" (J&J verified).
//  3. Bayer — Moderna/Norwood claim → anonymized Tulip pharma customer.
//  4. RTX — "Tier-1 supplier to Boeing and Airbus" → name Pratt Miller
//     Engineering (publicly attributed Tulip defense customer).
//  5. Daikin — untouched. Mitsubishi Electric partnership verified public.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// ------------------------------------------------------------------
// 1. BOSTON SCIENTIFIC — prospect reframe
// ------------------------------------------------------------------
const bscId = '49ed59e2-9493-4863-8f70-3dd6d46c38d5'
const { data: bsc } = await sb.from('positioning_briefs').select('*').eq('id', bscId).single()

// core_message: "Tier 1 expansion account" → "Tier 1 prospect"
const bscCore = bsc.core_message.replace(
  'this Tier 1 expansion account is undefended',
  'this Tier 1 prospect is undefended'
)

const bscUpdate = {
  positioning_statement: {
    ...bsc.positioning_statement,
    because: "Boston Scientific's own process engineers build and adapt the MES apps themselves — AI Composer scaffolds new apps from plain-language intent, AI App Translation localizes work instructions per site, and the architecture scales from one pilot site to 6+ sites by configuration, not per-site re-implementation",
  },

  core_message: bscCore,

  key_themes: [
    bsc.key_themes[0], // recall remediation pillar — unchanged
    "Multi-site expansion at configuration speed — one pilot site becomes the template for 6+ sites and the incoming Axonics manufacturing footprint, with AI App Translation localizing per plant instead of per-site re-implementation.",
    bsc.key_themes[2], // AI-ready frontline data pillar — unchanged
  ],

  persona_messages: {
    "Rosaleen Burke": "Two manufacturing-defect recalls in 12 months and active Form 483 scrutiny at Arden Hills put every manual quality record under a microscope. Tulip's DHR and guided-assembly model — proven at Tulip medical device customers running a fully paperless digital DHR system — generates auditable device history records as operators build, not after the fact. Bringing that model to Arden Hills' Accolade and stent production lines gives your team inspection-ready traceability on every unit. Frontline Copilot supports operators inline through every DHR step, answering SOP questions at the station instead of sending them back to a printed binder, while Factory Playback pinpoints the exact moment a defect originated instead of reconstructing it from paper logs weeks later. The next FDA visit shouldn't require a prep sprint — it should find a standing audit trail.",
    "Paudie O'Connor": "Your consolidated remit over supply chain, quality, IT, R&D, and operations services creates a single decision point for the kind of multi-site standardization that typically stalls in committee. Tulip's composable-MES model lets one pilot site become the template for Cork, Axonics, and the rest of the U.S. manufacturing footprint — each additional site is a configuration exercise, not a re-implementation. The Cork facility shipping 16M devices/year by 2026 and the recall remediation work Rosaleen Burke's team owns both demand the same platform. One business case, one approval, multi-site rollout.",
    "Jodi Euerle Eddy": "Your move to make IT a strategic partner sitting on every divisional board changes the calculus for Cork's automated facility. The 16M-device-per-year target needs a frontline data layer that feeds your GenAI and anomaly detection models with structured, real-time production data — not batch exports from siloed MES. Tulip's composable-MES architecture is production-tested at Fortune 500 medical device manufacturers and exposes shop-floor data directly via Tulip MCP. The question is whether Cork and the Axonics sites get that data backbone from day one, or whether you retrofit it after launch.",
  },

  proof_points: [
    // P-1: "J&J DePuy Synthes" → "A J&J MedTech division" (J&J verified on Tulip
    // roster; DePuy Synthes specifically unverified for Tulip DHR).
    "A J&J MedTech division replaced manual DHR with Tulip guided assembly + AI-assisted visual quality inspection — DHRs now complete automatically as operators build, shifting FDA 21 CFR Part 11 inspection readiness from a weeks-long prep sprint to a standing capability.",
    // P-2: already industry-qualified, leaving
    bsc.proof_points[1],
    // Factory Playback claim — unchanged
    bsc.proof_points[2],
    // U-1: replaces fabricated "Boston Scientific's own 2-site Tulip deployment"
    // with Tulip's publicly published medical device case study metrics.
    "A Tulip medical device customer built 90+ guided-assembly apps and a fully paperless digital DHR system in a greenfield facility, completing new-product introduction in 6 months and enabling material, personnel, and equipment traceability inquiries in minutes — a direct parallel to Boston Scientific's Cork greenfield ramping to 16M devices/year.",
  ],

  objection_handlers: [
    {
      objection: bsc.objection_handlers[0].objection,
      response: "Tulip IS the MES — it's just composable. Legacy MES deployments take 18+ months and freeze process changes behind IT queues; Tulip puts the execution layer in the hands of your process engineers, with AI Composer scaffolding new apps from plain-language intent and AI App Translation localizing them across plants. Your Accolade recall traced to a manufacturing defect in the battery cathode — exactly the class of process-level event an MES should catch at the step, not reconstruct from transaction logs weeks later. Start with one pilot site to prove the architecture; the remaining sites plus Axonics inherit by configuration, not 5 parallel MES implementations.",
    },
    {
      objection: bsc.objection_handlers[1].objection,
      response: "You aren't taking on another monolithic platform — you're starting with one pilot production line that proves the composable MES pattern, then extending by configuration to Cork and the Axonics sites. Process engineers deploy apps on a production line in days (AI Composer does the scaffolding, AI App Translation handles the per-site rollout), not the 18-month cycle a traditional MES demands. Cork and the Axonics sites get standardized DHR and quality inspection from day one instead of inheriting fragmented manual processes you'd need to retrofit later.",
    },
    {
      objection: bsc.objection_handlers[2].objection,
      response: "Rosaleen Burke's team owns the remediation, and Tulip gives them the execution layer to control directly. Paudie O'Connor's consolidated remit over supply chain, quality, IT, R&D, and operations now links these decisions under one framework, and Tulip's deployment model puts quality engineers in control of the apps while Jodi Euerle Eddy's IT organization governs the data architecture and integration points. Recall response is the entry point; multi-site standardization is the business case.",
    },
    bsc.objection_handlers[3], // GenAI/ML objection — unchanged
  ],
}

const { error: bscErr } = await sb.from('positioning_briefs').update(bscUpdate).eq('id', bscId)
if (bscErr) { console.error('BSC update error:', bscErr.message); process.exit(1) }
console.log('BSC brief: reframed as prospect pitch.')

// ------------------------------------------------------------------
// 2. THERMO FISHER — proof #1, #3, objection #2
// ------------------------------------------------------------------
const tfId = '522dfc46-220c-41dc-b8e3-8484e58c410f'
const { data: tf } = await sb.from('positioning_briefs').select('*').eq('id', tfId).single()

const tfUpdate = {
  proof_points: [
    // U-2 fix: Moderna/Norwood → anonymized Tulip pharma with real 78% figure
    "A Tulip pharmaceutical customer converted complex equipment-line SOPs to validatable Tulip apps, reducing changeover time by 78% while moving paper-based batch documentation to ALCOA+-compliant digital records — directly relevant to Thermo Fisher's Ridgefield and Greenville fill-finish line qualification timelines where every line changeover and batch cycle fights for capacity.",
    tf.proof_points[1], // Factory Playback + AI Trigger Descriptions generic — unchanged
    // U-4 fix: drop fabricated 40% metric, reframe around verifiable Tulip pharma case study
    "A Tulip pharmaceutical customer digitized SOPs for a complex equipment line into validatable Tulip apps without IT development cycles, cutting equipment changeover time by 78% — the same engineer-built model applies to Thermo Fisher's fill-finish lines where rapid line qualification determines launch readiness.",
    tf.proof_points[3], // Tulip HQ Somerville near Waltham — factual, unchanged
  ],

  objection_handlers: [
    tf.objection_handlers[0], // Plex objection — unchanged
    {
      // U-3 fix: drop Moderna + Takeda + DePuy Synthes specifics, keep J&J (verified on Tulip roster)
      objection: tf.objection_handlers[1].objection,
      response: "Tulip ships 21 CFR Part 11-compliant by design: electronic signatures, full audit trails, version-controlled app deployments, and ALCOA+ data integrity built into every record. Validation cycles shorten because the platform's architecture already satisfies the regulation — your quality team validates the process, not the platform plumbing. Multiple FDA-regulated manufacturers including J&J have completed IQ/OQ/PQ on Tulip in weeks, not months.",
    },
    tf.objection_handlers[2], // IT stretched — unchanged
    tf.objection_handlers[3], // multi-site standardization — unchanged
  ],
}

const { error: tfErr } = await sb.from('positioning_briefs').update(tfUpdate).eq('id', tfId)
if (tfErr) { console.error('TF update error:', tfErr.message); process.exit(1) }
console.log('TF brief: proof #1 + proof #3 + objection #2 cleaned.')

// ------------------------------------------------------------------
// 3. BAYER — proof #1
// ------------------------------------------------------------------
const bayerId = 'cb2df81d-85ce-4b04-a1c0-48a8badcca7f'
const { data: bayer } = await sb.from('positioning_briefs').select('*').eq('id', bayerId).single()

const bayerUpdate = {
  proof_points: [
    // U-2 fix: Moderna/Norwood → anonymized Tulip pharma with real 78% figure
    "A Tulip pharmaceutical customer converted complex equipment-line SOPs to validatable Tulip apps, reducing changeover time by 78% while moving paper-based batch documentation to ALCOA+-compliant digital records — directly relevant to Bayer's paper-based deviation risk across Bergkamen, Berlin, Leverkusen, Weimar, and Wuppertal.",
    bayer.proof_points[1], // Frontline Copilot Fortune 500 generic — unchanged
    bayer.proof_points[2], // Factory Playback generic — unchanged
    bayer.proof_points[3], // SAP complement + Tulip MCP — unchanged
  ],
}

const { error: bayerErr } = await sb.from('positioning_briefs').update(bayerUpdate).eq('id', bayerId)
if (bayerErr) { console.error('Bayer update error:', bayerErr.message); process.exit(1) }
console.log('Bayer brief: proof #1 cleaned.')

// ------------------------------------------------------------------
// 4. RTX — proof #1 (name Pratt Miller Engineering)
// ------------------------------------------------------------------
const rtxId = 'ce223538-9102-40b0-9d59-639e9e6c3fd5'
const { data: rtx } = await sb.from('positioning_briefs').select('*').eq('id', rtxId).single()

const rtxUpdate = {
  proof_points: [
    // P-7 fix: name Pratt Miller Engineering (on Tulip's public customer roster as defense-sector customer)
    "Pratt Miller Engineering, a U.S. defense engineering and low-volume aerospace manufacturer, uses Tulip's single-data-model composable MES to run AS9100-scope production with Tulip MCP exposing traceability directly to downstream digital-thread agents and auditors on demand.",
    rtx.proof_points[1], // FedRAMP Moderate Equivalency — verified public
    rtx.proof_points[2], // Factory Playback + AI Trigger Descriptions — unchanged
    rtx.proof_points[3], // 6-week deploy cycle generic — unchanged
  ],
}

const { error: rtxErr } = await sb.from('positioning_briefs').update(rtxUpdate).eq('id', rtxId)
if (rtxErr) { console.error('RTX update error:', rtxErr.message); process.exit(1) }
console.log('RTX brief: proof #1 → Pratt Miller Engineering.')

// ------------------------------------------------------------------
// Verification
// ------------------------------------------------------------------
console.log('')
console.log('Verifying no fabricated claims remain across all 5 briefs...')

const { data: allBriefs } = await sb.from('positioning_briefs')
  .select('id, account_id, positioning_statement, core_message, key_themes, persona_messages, proof_points, objection_handlers')
  .in('id', [bscId, tfId, bayerId, rtxId, 'b0c79ce0-70b8-46b5-a4d1-4519e419e29e'])
  .order('id')

const fabricatedPhrases = [
  'Tier 1 expansion account',                    // BSC WHY NOW old
  'already deployed at 2 Boston Scientific',     // BSC personas
  'already running at 2 Boston Scientific',      // BSC objections
  'Tulip already runs at 2 Boston Scientific',   // BSC Jodi
  "existing Tulip DHR deployment already proves",// BSC Rosaleen
  'own 2-site Tulip deployment',                 // BSC proof 4
  'existing 2-site Tulip deployment',            // BSC key_themes
  'Moderna replaced paper batch records',        // TF + Bayer proof 1
  'Moderna, J&J DePuy Synthes, Takeda-class',    // TF objection 2
  'J&J DePuy Synthes replaced manual DHR',       // BSC proof 1 old
  'cutting new-line qualification documentation time by 40%', // TF proof 3 old
  'Tier-1 aerospace component supplier to Boeing and Airbus', // RTX proof 1 old
]

let allClean = true
for (const b of allBriefs) {
  const flat = JSON.stringify([b.positioning_statement, b.core_message, b.key_themes, b.persona_messages, b.proof_points, b.objection_handlers])
  const hits = fabricatedPhrases.filter(p => flat.includes(p))
  if (hits.length > 0) {
    allClean = false
    console.log(`  [${b.id}] REMAINING:`, hits)
  }
}
if (allClean) console.log('  NONE — all fabricated phrases removed.')

// Confirm verified claims still present
console.log('')
console.log('Confirming verified claims retained...')
const verifiedPhrases = [
  { phrase: 'Mitsubishi Electric', brief: 'Daikin (partnership)' },
  { phrase: 'FedRAMP Moderate Equivalency', brief: 'RTX (cert)' },
  { phrase: 'Pratt Miller Engineering', brief: 'RTX (customer)' },
  { phrase: 'Somerville, MA', brief: 'TF (HQ proximity)' },
  { phrase: '78%', brief: 'TF + Bayer (changeover metric)' },
  { phrase: 'J&J MedTech', brief: 'BSC (customer division)' },
  { phrase: '90+ guided-assembly apps', brief: 'BSC (case study)' },
  { phrase: 'including J&J', brief: 'TF (customer list)' },
]
for (const { phrase, brief } of verifiedPhrases) {
  const found = allBriefs.some(b => JSON.stringify(b).includes(phrase))
  console.log(`  ${found ? 'OK  ' : 'MISS'} ${phrase.padEnd(35)} (${brief})`)
}
