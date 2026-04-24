// Bayer review pass — round 2, 2026-04-24.
//
// Per user direction:
//   A. interaction_stage: demo_eval → prospecting (reality: live ad, 0 clicks, no meetings)
//   B. Swap AI App Translation → Frontline Copilot (+ Tulip MCP where architectural).
//      Bayer's 5 sites are all in Germany, one language — multi-language
//      localization is not the value prop. Operator capability on the floor is.
//   C. Remove "investor narrative" phrase from Stefan Oelrich persona.
//   D. Clean headquarters artifact: "Leverkusen,\n  Germany" → "Leverkusen, Germany"
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const briefId = 'cb2df81d-85ce-4b04-a1c0-48a8badcca7f'
const acctId = '9928d575-64c8-4b20-96ee-b5abcfc4efe1'

// ---- A + D: account-level updates ----
const { error: acctErr } = await sb.from('accounts').update({
  interaction_stage: 'prospecting',
  headquarters: 'Leverkusen, Germany',
}).eq('id', acctId)
if (acctErr) { console.error('account update error:', acctErr.message); process.exit(1) }
console.log('Account: interaction_stage → prospecting, headquarters cleaned.')

// ---- B + C: brief updates ----
const { data: current } = await sb.from('positioning_briefs').select('*').eq('id', briefId).single()

const update = {
  positioning_statement: {
    ...current.positioning_statement,
    because: "Bayer's own process engineers build the MES apps themselves — AI Composer scaffolds new batch records from plain-language intent, Frontline Copilot supports operators inline at every Bergkamen, Berlin, Leverkusen, Weimar, and Wuppertal line, and SAP S/4 stays the ERP of record for planning and transactions",
  },

  key_themes: [
    current.key_themes[0], // compliance pillar — already good, no change
    "Five sites, one pattern — a Wuppertal pilot creates the replicable digital batch record template Holger Weintritt needs. The validated app ships to Bergkamen, Berlin, Leverkusen, and Weimar by configuration, with Frontline Copilot giving operators at every site inline support on every batch step.",
    current.key_themes[2], // engineer-owned / AI Composer — already good
  ],

  persona_messages: {
    "Sebastian Guth": current.persona_messages["Sebastian Guth"], // unchanged
    // Stefan — "investor narrative" phrase removed; reframed around operational KPIs
    "Stefan Oelrich": "The €2.3B savings target under Dynamic Shared Ownership demands that your manufacturing sites do more with fewer layers of management. Paper batch records are the opposite of that — every deviation requires manual reconciliation, every inspection cycle burns hours that self-service digital workflows would eliminate. A composable MES deployed at one Wuppertal production line gives your Pharmaceuticals Division a working proof point: AI Insights surfaces batch-review-time and deviation-rate gains directly into the operational KPIs your plant managers track — measurable cost-of-quality reduction without adding headcount.",
    "Andreas Marjoram": current.persona_messages["Andreas Marjoram"], // unchanged — no AI App Translation here
    // Holger — swap AI App Translation for Frontline Copilot + Tulip MCP
    "Holger Weintritt": "Your €1.4B investment across Bergkamen, Berlin, Leverkusen, Weimar, and Wuppertal names digital transformation as a pillar — but paper batch records remain the default on every one of those lines. With KERENDIA's label expansion driving solid-dose volume increases, Solida-1's GMP validation timeline is the forcing function. An electronic batch record pilot on a single Wuppertal line produces an ALCOA+-compliant audit trail from day one, and once the pattern replicates across Bergkamen, Berlin, Leverkusen, and Weimar, Frontline Copilot supports every operator through every batch step. Tulip MCP exposes the deviation and yield data back into the product-supply rollups and SAP stack you already run — giving you the template you need to sequence across all five sites before the next EMA inspection cycle.",
    "Saskia Steinacker": current.persona_messages["Saskia Steinacker"], // unchanged
  },

  proof_points: [
    current.proof_points[0], // Moderna — keep
    // Fortune 500 specialty pharma — swap AI App Translation for Frontline Copilot
    "A Fortune 500 specialty pharma manufacturer used Tulip Frontline Copilot to give operators in-line guidance on every batch step across multiple European GMP sites, reducing process deviation rates and batch-outcome variability in weeks — maps to Holger Weintritt's cross-site standardization need across the five German sites.",
    current.proof_points[2], // Factory Playback — keep
    current.proof_points[3], // composable MES + SAP S/4 + Tulip MCP — keep
  ],

  objection_handlers: [
    current.objection_handlers[0], // €1.4B — keep
    current.objection_handlers[1], // IT governance — keep
    current.objection_handlers[2], // restructuring — keep
    // Siemens/Körber — swap AI App Translation for Frontline Copilot
    {
      objection: "MES vendors like Siemens or Körber already serve our European pharma plants.",
      response: "Tulip IS the MES — it's just composable. At sites where Siemens or Körber are already on rails for scheduling and execution, keep them there. For new launch lines like Solida-1 and the Wuppertal pilot, Tulip is the composable MES your process engineers build directly — AI Composer scaffolds the first eBR from plain-language intent, Frontline Copilot supports operators inline through every batch step at Bergkamen, Berlin, Leverkusen, and Weimar, and Tulip MCP exposes the shop-floor data back to whichever MES/ERP stack each site is anchored to.",
    },
    current.objection_handlers[4], // validation — keep
  ],
}

const { error } = await sb.from('positioning_briefs').update(update).eq('id', briefId)
if (error) { console.error('brief update error:', error.message); process.exit(1) }
console.log('Brief: AI App Translation → Frontline Copilot/Tulip MCP; investor narrative removed.')

console.log('')
console.log('Verifying...')
const { data: verify } = await sb.from('positioning_briefs').select('*').eq('id', briefId).single()
const { data: verifyAcct } = await sb.from('accounts').select('interaction_stage, headquarters').eq('id', acctId).single()
const flat = JSON.stringify([verify.positioning_statement, verify.core_message, verify.key_themes, verify.persona_messages, verify.proof_points, verify.objection_handlers])

const banned = ['AI App Translation', 'investor narrative', 'layers on top', 'does not replace MES', 'rip-and-replace', 'frontline digitization layer', 'frontline layer', '[CUSTOMER NAME REQUIRED]', '[SOFT']
const hits = banned.filter(p => flat.includes(p))
console.log(`  banned phrases in brief: ${hits.length === 0 ? 'NONE' : hits.join(', ')}`)

const ai = ['AI Composer', 'Frontline Copilot', 'AI Insights', 'Tulip MCP', 'Factory Playback']
const found = ai.filter(f => flat.includes(f))
console.log(`  AI features cited: ${found.join(', ')}`)

console.log(`  account.interaction_stage: ${verifyAcct.interaction_stage}`)
console.log(`  account.headquarters:      "${verifyAcct.headquarters}"`)
