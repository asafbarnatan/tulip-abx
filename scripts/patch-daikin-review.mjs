// Daikin positioning brief review pass — 2026-04-24.
//
// Changes applied per user directive:
//   1. positioning_statement.category  → "a composable MES for kaizen-speed manufacturing"
//      (was vague "kaizen-rate production platform" — now claims the MES position)
//   2. positioning_statement.key_benefit → drop "without rip-and-replace" framing,
//      reframe as "plant by plant from a shared composable library"
//   3. persona_messages[Tomohiro Mizuguchi] → remove "Tulip layers on top of
//      existing systems" framing. Reframe as composable MES + Tulip MCP + AI
//      App Translation. Nathan's rule: Tulip IS the MES.
//   4. key_themes + 3 personas → weave in AI Composer, AI App Translation,
//      AI Insights, Tulip MCP, Frontline Copilot where they naturally fit.
//      Same rigor as the Thermo Fisher / RTX / Boston Scientific rewrites.
//   5. proof_points[2] → drop "capability" word. Per user direction, no
//      "+ AI Trigger Descriptions" addition for this account.
//   6. core_message → delete "before FY2025 close" from THE PLAY bullet 3.
//      Today is 2026-04-24 (FY2025 already closed in Japan); reference would
//      read as stale/out-of-date to Nathan.
//
// Untouched: positioning_statement.for, unlike, because. objection_handlers.
// recommended_tone. proof_points 1/2/4. approved=true stays approved.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const briefId = 'b0c79ce0-70b8-46b5-a4d1-4519e419e29e'

// Fetch current core_message so we can do a surgical string replace (preserves
// the literal `\n` escape convention the existing data uses).
const { data: current, error: fetchErr } = await sb
  .from('positioning_briefs').select('core_message').eq('id', briefId).single()
if (fetchErr) { console.error('fetch error:', fetchErr.message); process.exit(1) }

const newCoreMessage = current.core_message.replace(
  'Indonesia or Plymouth greenfield before FY2025 close',
  'Indonesia or Plymouth greenfield'
)
if (newCoreMessage === current.core_message) {
  console.error('WARN: "before FY2025 close" substring not found in core_message — check for typo/whitespace')
}

const update = {
  positioning_statement: {
    for: "Daikin production engineering leaders standardizing monozukuri across 98 plants under Fusion 25 DX pressure",
    category: "a composable MES for kaizen-speed manufacturing",
    key_benefit: "replaces paper work instructions with operator-adaptive digital apps that deploy plant by plant from a shared composable library",
    unlike: "rigid monolithic MES deployments that stall at one factory and never reach the other 97",
    because: "production engineers build and adapt apps themselves at kaizen-cycle speed, matching Daikin's continuous-improvement DNA",
  },

  core_message: newCoreMessage,

  key_themes: [
    "Monozukuri at digital speed — Tulip matches Daikin's kaizen rhythm by letting production engineers iterate work instructions in days, not months. AI Composer scaffolds each new app from plain-language intent, so a kaizen countermeasure becomes production-ready in the same shift it was conceived.",
    "Production engineers build, not wait — Tulip gives Daikin's frontline engineers pre-built blocks (IoT data, SPC charts, GxP workflows, andon escalation) plus AI Composer for plain-language app scaffolding, so they compose the exact app each plant needs without a central IT queue or a six-month consulting engagement.",
    "A composable MES, not a rigid one — Tulip is the MES, but unlike monolithic deployments that lock every plant into one global configuration, Tulip is composed plant by plant from a shared library. AI App Translation localizes the same validated app across 29+ languages so Osaka's approved pattern lands in Bangkok, Plymouth, and Houston without per-site reimplementation.",
  ],

  persona_messages: {
    "Hiroaki Ueda": "Three consecutive METI DX Stock designations raise the bar — the next annual report needs a shop-floor case study, not another strategy slide. Your ¥180B DX budget names 'connect equipment' and 'monozukuri reforms' as deliverables, but a rigid MES deployment across 98 plants will not land in a single Fusion 25 reporting cycle. Tulip is the composable MES your production engineers build themselves: AI Composer scaffolds the first digital work instruction from plain-language intent, AI Insights surfaces the yield and cycle-time data in dashboards you can drop directly into the next Fusion 25 report, and Tulip MCP exposes the structured shop-floor data to whatever digital-thread agent your DX team stands up next. One Indonesia or Plymouth line, weeks to production, reportable before the next investor cycle.",
    "Isao Hasegawa": "Standardizing production engineering practices across 98 globally distributed plants breaks down wherever paper work instructions meet local interpretation. Your team owns line design, cell layout, and SOP standards — but enforcement at the Indonesia greenfield or Plymouth R&D lab depends on tools your engineers can actually modify without waiting in an IT queue. Tulip is the composable MES: AI Composer scaffolds new apps from plain-language intent, Frontline Copilot supports operators inline during tech transfer, and built-in andon alerts plus machine data capture feed back into your kaizen cycles automatically. Your engineers push versioned work instructions to operators directly, and AI App Translation localizes each app across every plant language without manual translation effort.",
    "Shigeki Morita": "Across 98 production facilities, every inconsistent paper work instruction is a first-pass-yield risk that rolls up to your P&L. Fusion 25's monozukuri reforms demand measurable quality gains — not another IT project that stalls at one site. Tulip is the composable MES your production engineering teams adapt at kaizen speed: digital work instructions, AI-assisted inline quality inspection, and real-time defect tracking compound across every AC, applied systems, and refrigeration line you own. AI Insights surfaces the yield and deviation trends directly to you and to your plant managers, so you act on a live signal instead of reconstructing yesterday from paper. One pilot line produces auditable yield data you can use to justify the next 97.",
    "Tomohiro Mizuguchi": "Any platform that touches plant data across 98 sites and connects to existing ERP infrastructure needs to clear your security review and data residency requirements cleanly. Tulip is the composable MES — the execution layer your production engineers build themselves, with AI App Translation localizing each app across 29+ languages for global rollout and Tulip MCP exposing structured plant data to your digital-thread and AI stack on demand. Your IT team governs access, data flows, and integration architecture; production engineering builds and iterates the frontline apps inside those guardrails, so Tulip stays within your control, not in shadow IT. Regional data residency, role-based access, and standard API integration to upstream ERP are all first-class in the platform.",
  },

  proof_points: [
    "A Fortune 500 discrete manufacturer achieved >95% first-time yield on a critical assembly station within one quarter of replacing paper work instructions with Tulip apps — directly relevant to Shigeki Morita's QC accountability across Daikin's AC and refrigeration lines.",
    "A leading industrial equipment manufacturer hit near-100% daily production target attainment by replacing spreadsheet tracking with real-time Tulip production apps — maps to Daikin's 98-plant visibility gap where supervisors reconstruct yesterday from paper instead of acting during the shift.",
    "Tulip Factory Playback collapsed root cause analysis from days to hours by combining time-synced video with production data on a single timeline — applicable to Daikin's greenfield ramp-ups where defect patterns emerge fast and correction windows are narrow.",
    "Tulip's strategic partnership with Mitsubishi Electric provides Japanese manufacturing market infrastructure and local support — relevant to Daikin's consensus-driven vendor evaluation (nemawashi) process.",
  ],
}

const { error } = await sb.from('positioning_briefs').update(update).eq('id', briefId)
if (error) { console.error('update error:', error.message); process.exit(1) }

console.log('Daikin brief updated.')
console.log('')
console.log('Verifying no banned phrases remain...')

const { data: verify } = await sb.from('positioning_briefs').select('*').eq('id', briefId).single()
const flat = JSON.stringify([verify.positioning_statement, verify.core_message, verify.key_themes, verify.persona_messages, verify.proof_points, verify.objection_handlers])
const banned = ['Tulip layers on top', 'layers on top of existing systems', "layers on top of Plex", 'rip-and-replace', 'before FY2025 close', '[CUSTOMER NAME REQUIRED]', '[SOFT', 'Factory Playback capability']
const hits = banned.filter(p => flat.includes(p))
if (hits.length === 0) console.log('  NONE — clean.')
else console.log('  REMAINING:', hits)
