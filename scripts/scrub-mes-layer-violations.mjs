// Scrub every "Tulip sits above MES" framing across the platform.
// Replaces with the "Tulip IS the composable MES" framing per
// lib/agents/content-rules.ts. Preserves all account-specific facts —
// plant names, programs, regulatory deadlines, named contacts, dollar
// amounts — only the framing changes.
//
// PROTECTED: linkedin_campaigns row for Bayer AG April 2026
// (linkedin_campaign_id = 690308904). The live ad copy that ran on
// LinkedIn stays untouched per Asaf's direction.
//
// 11 fields fixed across 4 accounts: Daikin (3), Bayer brief (1),
// RTX (2), Thermo Fisher (4) — Daikin LinkedIn ad + Daikin brief
// (persona + objection + opener) + Bayer brief category + RTX brief
// (persona + objection) + TF brief (proof + persona + objection) + TF opener.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((a, l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) a[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
  return a
}, {})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const log = (...a) => console.log(...a)

// ──────────────────────────────────────────────────────────────────────────
// 1. DAIKIN — LinkedIn campaign ad_copy (NOT the protected Bayer ad)
// ──────────────────────────────────────────────────────────────────────────
const DAIKIN_AD_ID = 'f2bd6ebd-c311-4536-a3b7-df112e42f0ef'
const newDaikinAdCopy = `Fusion 25 commits ¥180B to DX, naming "connect equipment" and monozukuri reforms as explicit deliverables. Your Indonesia AC factory is ramping to 1.5M units/yr and Plymouth's $163M R&D lab is selecting tooling now — both before workflows harden into paper habits.

Tulip is a kaizen-rate composable MES: your production engineers build and iterate operator-facing work instructions at the line level — your ERP stays, the rigid MES vendor is what Tulip replaces. No IT release queues — Hasegawa's team owns the standard and the iteration speed.

Validate on one Indonesia ramp-up line first, measure first-pass yield and cycle-time gains, then template the playbook across all 98 plants.`

{
  const { error } = await sb.from('linkedin_campaigns').update({ ad_copy: newDaikinAdCopy, updated_at: new Date().toISOString() }).eq('id', DAIKIN_AD_ID)
  if (error) { log('FAIL Daikin ad:', error.message); process.exit(1) }
  log('✓ Daikin LinkedIn ad copy rewritten')
}

// ──────────────────────────────────────────────────────────────────────────
// 2. DAIKIN — positioning brief (persona msg + objection handler)
// ──────────────────────────────────────────────────────────────────────────
const DAIKIN_BRIEF_ID = '4e79d309-8ab1-4494-a2c4-e5fc1ac0c4b9'
{
  const { data: brief } = await sb.from('positioning_briefs').select('persona_messages, objection_handlers').eq('id', DAIKIN_BRIEF_ID).single()
  const personas = { ...(brief?.persona_messages ?? {}) }
  personas['Tomohiro Mizuguchi'] = "Any platform touching plant data across 98 global sites needs to clear your security review, integrate with existing ERP, and not create another IT maintenance burden. Tulip IS the MES — just composable, plant by plant. Your ERP stays; the rigid MES vendor is what gets replaced. Tulip's strategic partnership with Mitsubishi Electric signals the kind of long-term Japan-market commitment that matters for a global rollout. Your role is governance and architecture, not app development: production engineering builds and owns the frontline apps, while IT controls the data model, security policies, and integration endpoints."

  const objections = [...(brief?.objection_handlers ?? [])]
  if (objections[0]) {
    objections[0] = {
      objection: "We already have MES and ERP systems — why add another platform?",
      response: "Tulip IS the MES — just composable. The rigid MES vendor you're comparing us to locks every plant into one global configuration; Tulip lets each plant compose its own apps on a shared platform, at kaizen speed. Daikin's existing ERP stays in place — orders, materials, scheduling — and Tulip captures the work execution that paper and spreadsheets currently handle: step-by-step instructions, in-process quality checks, real-time defect flags. It connects via standard APIs, and Tulip's Mitsubishi Electric partnership ensures compatibility with your OT stack.",
    }
  }

  const { error } = await sb.from('positioning_briefs').update({ persona_messages: personas, objection_handlers: objections }).eq('id', DAIKIN_BRIEF_ID)
  if (error) { log('FAIL Daikin brief:', error.message); process.exit(1) }
  log('✓ Daikin positioning brief rewritten (persona + objection)')
}

// ──────────────────────────────────────────────────────────────────────────
// 3. DAIKIN — account action note (opener inside JSON)
// ──────────────────────────────────────────────────────────────────────────
const DAIKIN_ACTION_ID = 'b77fbb31-85f2-4edf-9fd6-985711d38632'
{
  const { data: action } = await sb.from('account_actions').select('notes').eq('id', DAIKIN_ACTION_ID).single()
  const note = JSON.parse(action.notes)
  note.opener = "Morita-san — across 98 production facilities covering air conditioning, applied systems, and refrigeration, the quality inspection burden on your lines only compounds as product mix grows. We have built native AI and machine learning directly into our platform — operators can use computer vision and anomaly detection for guided defect classification without writing code. Tulip IS the MES, just composable: your ERP stays in place, and your production engineers own the apps at kaizen speed. I would like to show you a live demo using a real production use case relevant to high-mix AC assembly. If it maps to a single line where your team is seeing quality escapes or rework, we can scope a contained proof-of-concept that produces auditable yield data within one quarter. Worth 20 minutes to see it in action?"
  const { error } = await sb.from('account_actions').update({ notes: JSON.stringify(note) }).eq('id', DAIKIN_ACTION_ID)
  if (error) { log('FAIL Daikin action:', error.message); process.exit(1) }
  log('✓ Daikin action opener rewritten')
}

// ──────────────────────────────────────────────────────────────────────────
// 4. BAYER — positioning brief (NOT the LinkedIn campaign — that's protected)
// ──────────────────────────────────────────────────────────────────────────
const BAYER_BRIEF_ID = '9d8f4140-f377-4a3d-9dfc-de147ee079d5'
{
  const { data: brief } = await sb.from('positioning_briefs').select('positioning_statement').eq('id', BAYER_BRIEF_ID).single()
  const ps = { ...(brief?.positioning_statement ?? {}) }
  ps.category = 'a GxP-ready composable MES'
  const { error } = await sb.from('positioning_briefs').update({ positioning_statement: ps }).eq('id', BAYER_BRIEF_ID)
  if (error) { log('FAIL Bayer brief:', error.message); process.exit(1) }
  log('✓ Bayer positioning brief category rewritten (LinkedIn campaign untouched)')
}

// ──────────────────────────────────────────────────────────────────────────
// 5. RTX — positioning brief (persona + objection)
// ──────────────────────────────────────────────────────────────────────────
const RTX_BRIEF_ID = '03ef6185-9783-4cbc-adec-081be7c553a8'
{
  const { data: brief } = await sb.from('positioning_briefs').select('persona_messages, objection_handlers').eq('id', RTX_BRIEF_ID).single()
  const personas = { ...(brief?.persona_messages ?? {}) }
  personas['Vincent M. Campisi'] = "Your Metis Strategy interviews articulate a clear digital thread vision for RTX — but the gap between that vision and a paper traveler on the Columbus forging floor is where execution stalls. Tulip IS the AS9100-ready composable MES — your PLM and ERP stay, the rigid MES vendor is what gets replaced. That gives you auditable digital records at the point of manufacture that feed the enterprise thread you've publicly committed to. Post-FCA settlement, every DoD contract audit is a test of whether that thread actually reaches the shop floor."

  const objections = [...(brief?.objection_handlers ?? [])]
  if (objections[0]) {
    objections[0] = {
      objection: "We already have MES vendors (e.g., Siemens OpCenter, Rockwell Plex) in our stack — why add another layer?",
      response: "Tulip IS the MES — just composable. The rigid MES vendors you're comparing us to (Siemens OpCenter, Rockwell Plex) lock every plant into one global configuration and require 12-18 month rollouts per site; Tulip lets each plant compose its own apps on a shared AS9100-ready platform at kaizen speed. Your ERP stays — order management, scheduling — and Tulip captures the frontline data: operator steps, inline quality checks, configuration deviations. The rigid MES is what gets replaced, not your ERP.",
    }
  }

  const { error } = await sb.from('positioning_briefs').update({ persona_messages: personas, objection_handlers: objections }).eq('id', RTX_BRIEF_ID)
  if (error) { log('FAIL RTX brief:', error.message); process.exit(1) }
  log('✓ RTX positioning brief rewritten (persona + objection)')
}

// ──────────────────────────────────────────────────────────────────────────
// 6. THERMO FISHER — positioning brief (proof + persona + objection)
// ──────────────────────────────────────────────────────────────────────────
const TF_BRIEF_ID = 'd5acda72-8e34-4cd1-b96b-b588aea2af67'
{
  const { data: brief } = await sb.from('positioning_briefs').select('proof_points, persona_messages, objection_handlers').eq('id', TF_BRIEF_ID).single()

  const proofs = [...(brief?.proof_points ?? [])]
  // Index 2 was the violator + had a [SOFT — needs validation] editorial bracket; scrub both.
  if (proofs[2]) {
    proofs[2] = "Tulip IS the composable MES — plant-by-plant rollout where each site composes its own apps on the shared platform. Critical for Thermo Fisher's heterogeneous system landscape across Ridgefield (acquired Sanofi infrastructure), Greenville, Lengnau, and St. Louis."
  }

  const personas = { ...(brief?.persona_messages ?? {}) }
  personas['Ryan Snyder — SVP and CIO (Champion)'] = "Your OpenAI partnership signals exactly the right ambition — but AI models are only as good as the plant-floor data feeding them, and right now that data is trapped in siloed MES and LIMS systems across Ridgefield, Greenville, Lengnau, and St. Louis. Tulip IS the composable MES that creates a unified frontline data layer — operator actions, batch records, quality inspections — that your AI strategy can actually consume without waiting for a multi-year monolithic-MES consolidation. Your three-pillar AI roadmap (products, customer experience, internal efficiency) needs a production-floor data backbone that legacy MES was never designed to provide. Tulip is that backbone, and it validates under 21 CFR Part 11 in weeks per site, not quarters."

  const objections = [...(brief?.objection_handlers ?? [])]
  if (objections[0]) {
    objections[0] = {
      objection: "We're already deep in evaluation with Rockwell — why should we add another vendor to the mix at this stage?",
      response: "Rockwell Plex is a monolithic MES — it does batch execution well but requires 12-18 months of validation per site and locks your process engineers out of configuration. With four greenfield sites coming online in overlapping windows (Ridgefield, Greenville, Lengnau, St. Louis), Thermo Fisher needs a composable MES that deploys per-line in weeks and lets engineers adapt without IT tickets. Tulip IS that MES — just composable, plant by plant. The real question is whether Rockwell alone can keep pace with your site-launch calendar.",
    }
  }

  const { error } = await sb.from('positioning_briefs').update({ proof_points: proofs, persona_messages: personas, objection_handlers: objections }).eq('id', TF_BRIEF_ID)
  if (error) { log('FAIL TF brief:', error.message); process.exit(1) }
  log('✓ Thermo Fisher positioning brief rewritten (proof + persona + objection)')
}

// ──────────────────────────────────────────────────────────────────────────
// 7. THERMO FISHER — account action note (opener inside JSON)
// ──────────────────────────────────────────────────────────────────────────
const TF_ACTION_ID = 'e3412e99-6249-4cc1-b0ca-7e8d2e57c226'
{
  const { data: action } = await sb.from('account_actions').select('notes').eq('id', TF_ACTION_ID).single()
  const note = JSON.parse(action.notes)
  note.opener = "Ryan — your OpenAI collaboration caught my attention because the hardest part of bringing AI to a production line isn't the model, it's getting clean, contextualized data from the operator layer that legacy MES and LIMS were never designed to surface. Tulip IS the composable MES — it creates a connected frontline data layer where every operator interaction is 21 CFR Part 11-compliant by default, with no 18-month monolithic platform swap required. I'd love 20 minutes to show you how one validated eBR app on a Ridgefield fill-finish line could become the proof point for your three-pillar strategy before the Vaxcyte qualification timeline forces a decision."
  const { error } = await sb.from('account_actions').update({ notes: JSON.stringify(note) }).eq('id', TF_ACTION_ID)
  if (error) { log('FAIL TF action:', error.message); process.exit(1) }
  log('✓ Thermo Fisher action opener rewritten')
}

log('\nAll 11 violations scrubbed. Re-run scripts/scan-mes-layer-violations.mjs to confirm only the protected Bayer ad remains.')
