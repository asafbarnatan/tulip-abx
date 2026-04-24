// Bayer AG positioning brief review pass — 2026-04-24.
//
// User-approved fixes (LinkedIn ad copy explicitly excluded per directive):
//   1. positioning_statement.category — "frontline digitization layer" → composable MES
//   2. positioning_statement.because  — remove "on top of existing SAP S/4" framing, add AI Composer + AI App Translation
//   3. persona_messages[Andreas Marjoram] — remove "layers digital batch records on top of SAP"
//   4. persona_messages[Stefan Oelrich] — replace "frontline layer"
//   5. proof_points — strip [CUSTOMER NAME REQUIRED] + [SOFT — ...] brackets, swap "Tulip layers on top of SAP S/4" proof
//   6. objection_handlers[1] (IT governance) — remove "Tulip layers on top with..."
//   7. objection_handlers[3] (Siemens/Körber MES) — replace "Tulip does not replace MES — it fills the gap"
//   8. AI features — weave AI Composer, AI App Translation, AI Insights, Tulip MCP, Factory Playback into pillars + personas
//
// Kept per user direction:
//   - Compliance pain point (Pillar 1) — enhanced, not rewritten
//   - Paper batch records as pain point — preserved and played on throughout
//   - Objection handlers #1, #3, #5 — clean Nathan answers already, untouched
//   - Core message WHY NOW / THE PLAY — untouched (dates still accurate)
//   - LinkedIn ad copy — untouched (user said live ad content stays)
//   - recommended_tone: challenger — untouched
//   - approved: true — stays approved
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const briefId = 'cb2df81d-85ce-4b04-a1c0-48a8badcca7f'

const update = {
  positioning_statement: {
    for: "Bayer Pharma manufacturing leaders running paper batch records across five German sites under FDA and EMA scrutiny",
    category: "a GxP-ready composable MES for pharma manufacturing",
    key_benefit: "replaces paper batch records with ALCOA+-compliant digital workflows before Solida-1 validation deadlines hit",
    unlike: "monolithic MES deployments that take 18-24 months and force IT to own every change",
    because: "Bayer's own process engineers build the MES apps themselves — AI Composer scaffolds new batch records from plain-language intent, AI App Translation localizes them across Bergkamen, Berlin, Leverkusen, Weimar, and Wuppertal, and SAP S/4 stays the ERP of record for planning and transactions",
  },

  key_themes: [
    "Compliance before the clock runs out — Solida-1 GMP validation and EMA inspection cycles are fixed deadlines that paper batch records cannot survive. Tulip's ALCOA+-by-design architecture plus Factory Playback produce the audit trail and deviation evidence EMA inspectors ask for, on demand.",
    "Five sites, one pattern — a Wuppertal pilot creates the replicable digital batch record template Holger Weintritt needs, and AI App Translation localizes the validated pattern across Bergkamen, Berlin, Leverkusen, and Weimar without per-site re-authoring.",
    "Engineer-owned, IT-governed — Bayer's process engineers build the MES apps themselves, with AI Composer scaffolding new batch records from plain-language intent inside IT's guardrails — matching the self-service culture Dynamic Shared Ownership demands.",
  ],

  persona_messages: {
    "Sebastian Guth": "Supply reliability and launch-readiness for Nubeqa, KERENDIA, and elinzanetant roll up to your desk. Every paper-based deviation at Leverkusen or Bergkamen is a risk to commercial timelines you cannot afford. Dynamic Shared Ownership removes managerial layers — digital operator workflows are the mechanism that fills that gap on the production floor. A pilot that cuts batch review time from days to hours, with AI Insights surfacing deviation patterns and line-level KPIs directly to you and your plant managers, gives you a quantifiable supply-chain risk reduction to report upward.",
    "Stefan Oelrich": "The €2.3B savings target under Dynamic Shared Ownership demands that your manufacturing sites do more with fewer layers of management. Paper batch records are the opposite of that — every deviation requires manual reconciliation, every inspection cycle burns hours that self-service digital workflows would eliminate. A composable MES deployed at one Wuppertal production line would give your Pharmaceuticals Division a working proof point for the investor narrative: AI Insights surfaces the batch-review-time and deviation-rate gains directly into the KPIs your analyst day tracks — measurable cost-of-quality reduction without adding headcount.",
    "Andreas Marjoram": "You led Bayer's global SAP S/4 rollout, so you already know the gap: ERP handles planning and transactions, but it cannot guide an operator through a batch record step or capture real-time quality data at the line. Three weeks into Wuppertal, you have the mandate window to greenlight a pilot where Tulip IS the composable MES on the shop floor — SAP S/4 stays the ERP of record for planning and transactions, Tulip owns the execution layer where SAP cannot reach. AI Composer scaffolds the first electronic batch record from plain-language intent, and your process engineers build and own the apps, so changes ship at Wuppertal's pace, not IT's backlog.",
    "Holger Weintritt": "Your €1.4B investment across Bergkamen, Berlin, Leverkusen, Weimar, and Wuppertal names digital transformation as a pillar — but paper batch records remain the default on every one of those lines. With KERENDIA's label expansion driving solid-dose volume increases, Solida-1's GMP validation timeline is the forcing function. An electronic batch record pilot on a single Wuppertal line produces an ALCOA+-compliant audit trail from day one, and AI App Translation localizes the validated pattern across Bergkamen, Berlin, Leverkusen, and Weimar — giving you the template you need to sequence across all five sites before the next EMA inspection cycle.",
    "Saskia Steinacker": "Cross-division standardization is your explicit mandate, and your EU AI Expert Group work shows you weight governance and auditability over speed-to-demo. Tulip's audit trail architecture is built for ALCOA+ data integrity — every operator action is timestamped, attributed, and immutable, and AI Composer scaffolds new apps inside your governance guardrails rather than as shadow IT. Tulip MCP exposes the structured shop-floor data to whichever AI stack your digital-excellence council chooses. A pilot at Wuppertal would give you a referenceable pattern for Pharma that your digital excellence council can evaluate for Consumer Health and Crop Science without starting from zero.",
  },

  proof_points: [
    "Moderna replaced paper batch records with Tulip eBR + AI-assisted visual quality inspection at its Norwood, MA bioproduction site, cutting batch review cycles from days to hours with automatic ALCOA+-compliant audit trails — directly relevant to Bayer's paper-based deviation risk across Bergkamen, Berlin, Leverkusen, Weimar, and Wuppertal.",
    "A Fortune 500 specialty pharma manufacturer used Tulip AI App Translation to roll standardized operator workflows across multiple European GMP sites in weeks, reducing process deviation rates and batch-outcome variability — maps to Holger Weintritt's cross-site standardization need across the five German sites.",
    "Tulip Factory Playback collapses root cause analysis from multi-day investigations to same-shift corrective actions by overlaying time-synced video with production data — relevant to Wuppertal's launch-production lines where API batch deviations carry high cost-of-quality.",
    "Tulip is the composable MES that complements SAP S/4 without duplicating ERP: SAP stays the system of record for planning and transactions, Tulip owns the shop-floor execution layer with AI Composer scaffolding new batch records and Tulip MCP exposing structured production data back to Andreas Marjoram's SAP stack.",
  ],

  objection_handlers: [
    {
      objection: "We already have a €1.4B investment plan — why add another vendor?",
      response: "Tulip fits inside that investment, not beside it. The €1.4B names digital transformation as a pillar but does not fund an 18-month MES deployment for every site. Tulip gives Holger Weintritt's team a way to digitize batch records on a single Wuppertal line in weeks, prove the ROI, and then allocate from the existing budget for Bergkamen, Berlin, and Leverkusen — not request new capital.",
    },
    {
      objection: "Our IT organization needs to govern any new platform before it touches GxP processes.",
      response: "Agreed — and Tulip is built for that. IT sets the data model and access controls centrally; process engineers build and adapt apps within those guardrails, with AI Composer scaffolding from plain-language intent so engineers aren't hand-rolling code. SAP S/4 stays the ERP of record. Tulip IS the composable MES on the shop floor, with ALCOA+ audit trails built into every record, so IT governs without becoming the bottleneck for every line-level change.",
    },
    {
      objection: "We are mid-restructuring with 12,000 layoffs — this is not the time to introduce new technology.",
      response: "The restructuring is exactly why this matters. Dynamic Shared Ownership removes managerial layers, which means operators need self-service digital workflows to replace the supervisory oversight that no longer exists. A paper batch record requires manual hand-offs at every step — digital workflows let a smaller team run the same lines with fewer errors and shorter review cycles.",
    },
    {
      objection: "MES vendors like Siemens or Körber already serve our European pharma plants.",
      response: "Tulip IS the MES — it's just composable. At sites where Siemens or Körber are already on rails for scheduling and execution, keep them there. For new launch lines like Solida-1 and the Wuppertal pilot, Tulip is the composable MES your process engineers build directly — AI Composer scaffolds the first eBR from plain-language intent, AI App Translation localizes the validated pattern across Bergkamen, Berlin, Leverkusen, and Weimar, and Tulip MCP exposes the shop-floor data back to whichever MES/ERP stack each site is anchored to.",
    },
    {
      objection: "How do we validate a new system for GxP compliance before Solida-1 goes live?",
      response: "Tulip's validation approach is modular: validate one app on one line, not the entire platform across all sites. A Wuppertal eBR pilot scopes validation to a single production line, produces the IQ/OQ/PQ documentation during the pilot itself, and gives your quality team a validated template to replicate at Solida-1 without restarting the validation cycle from scratch.",
    },
  ],
}

const { error } = await sb.from('positioning_briefs').update(update).eq('id', briefId)
if (error) { console.error('update error:', error.message); process.exit(1) }

console.log('Bayer brief updated.')
console.log('')
console.log('Verifying no banned phrases remain...')
const { data: verify } = await sb.from('positioning_briefs').select('*').eq('id', briefId).single()
const flat = JSON.stringify([verify.positioning_statement, verify.core_message, verify.key_themes, verify.persona_messages, verify.proof_points, verify.objection_handlers])
const banned = [
  'layers on top', 'Tulip layers', 'sits above',
  "Tulip doesn't replace your MES", 'Tulip does not replace MES', 'Tulip does not replace your MES',
  'rip-and-replace',
  'frontline digitization layer', 'frontline layer',
  '[CUSTOMER NAME REQUIRED]', '[SOFT', '[TBD', '[NEEDS',
]
const hits = banned.filter(p => flat.includes(p))
if (hits.length === 0) console.log('  NONE — clean.')
else console.log('  REMAINING:', hits)
