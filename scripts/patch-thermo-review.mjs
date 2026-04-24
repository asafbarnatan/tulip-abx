// Thermo Fisher review pass — 2026-04-24.
//
//   1. Strip trailing periods from positioning_statement fragments
//   2. approved: false → true
//   3. Daniella Cramp persona — sharpen J&J reference with verified detail
//      (Global President, Neurovascular + U.S. President, Biosense Webster)
//   4. Daniella Cramp persona — sharpen the "8 new bioreactors" claim with
//      the verified 2025 specifics (4×5,000L SUBs Lengnau / 4×2,000L St.
//      Louis / Hyderabad + Incheon + Singapore Design Centers)
//
// KEPT: three-pillar AI strategy phrasing — confirmed as Ryan Snyder's public
// framing via the Metis Strategy interview titled "Thermo Fisher's Three-Pillar
// AI Strategy." The BusinessWire signal's 4-area list describes OpenAI-embedding
// tactics sitting under those 3 pillars; different abstraction layer.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const briefId = '522dfc46-220c-41dc-b8e3-8484e58c410f'
const { data: current } = await sb.from('positioning_briefs').select('*').eq('id', briefId).single()

// ---- 1. Strip trailing periods from positioning_statement ----
const stripPeriod = s => typeof s === 'string' && s.endsWith('.') ? s.slice(0, -1) : s
const ps = { ...current.positioning_statement }
for (const field of ['for', 'unlike', 'because', 'category', 'key_benefit']) {
  ps[field] = stripPeriod(ps[field])
}

// ---- 3 + 4. Enrich Daniella Cramp persona with verified specifics ----
const personas = { ...current.persona_messages }
const daniellaKey = Object.keys(personas).find(k => k.toLowerCase().startsWith('daniella cramp'))
if (daniellaKey) {
  personas[daniellaKey] = "Four 5,000L single-use bioreactors coming online at Lengnau and four 2,000L units at St. Louis in 2025, plus Bioprocess Design Centers expanding across Hyderabad, Incheon, and Singapore — every new line is a fresh opportunity for process variability to creep in if the startup runs on tribal knowledge and site-specific paper SOPs. Tulip is the composable MES your process engineers build themselves: AI App Translation localizes the same validated workflow from Lengnau to St. Louis to the Asia design centers, so the bioreactor startup in one site runs the same procedure as another without a six-month MES customization project per plant. Your time running J&J's Neurovascular Global business and Biosense Webster as U.S. President means you've seen operations rigor at scale — this is that model, built for GMP bioproduction and deployable before your next bioreactor campaign goes live."
}

const update = {
  positioning_statement: ps,
  persona_messages: personas,
  approved: true,
}

const { error } = await sb.from('positioning_briefs').update(update).eq('id', briefId)
if (error) { console.error('update error:', error.message); process.exit(1) }

console.log('Thermo Fisher brief updated.')
console.log('')
console.log('Verifying...')
const { data: verify } = await sb.from('positioning_briefs').select('*').eq('id', briefId).single()

const psFields = verify.positioning_statement
const stillHasPeriods = ['for', 'unlike', 'because', 'category', 'key_benefit'].filter(f => typeof psFields[f] === 'string' && psFields[f].endsWith('.'))
console.log(`  positioning_statement trailing periods: ${stillHasPeriods.length === 0 ? 'NONE' : stillHasPeriods.join(', ')}`)
console.log(`  approved: ${verify.approved}`)

const flat = JSON.stringify(verify)
const verified = [
  { phrase: 'three-pillar', note: 'confirmed per Metis Strategy interview' },
  { phrase: '5,000L', note: 'Lengnau bioreactor spec verified' },
  { phrase: 'Hyderabad', note: 'India Design Center verified' },
  { phrase: 'Biosense Webster', note: 'Daniella Cramp prior role verified' },
  { phrase: 'including J&J', note: 'IQ/OQ/PQ customer reference' },
  { phrase: 'composable MES', note: 'Nathan framing' },
]
console.log('  verified public claims retained:')
for (const { phrase, note } of verified) {
  console.log(`    ${flat.includes(phrase) ? 'OK  ' : 'MISS'} "${phrase}" — ${note}`)
}

const banned = ['layers on top', 'does not replace MES', 'rip-and-replace', '[CUSTOMER NAME REQUIRED]', '[SOFT', 'Moderna']
const hits = banned.filter(p => flat.includes(p))
console.log(`  banned phrases: ${hits.length === 0 ? 'NONE' : hits.join(', ')}`)
