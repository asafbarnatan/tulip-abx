// Extract every named company, named partnership, and specific numeric result
// claim across all 5 positioning briefs. Output a flat list for side-by-side
// verification against Tulip's public customer/partner roster.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const { data: accounts } = await sb.from('accounts').select('id,name').in('name', [
  'Daikin Industries', 'Bayer AG', 'Boston Scientific', 'Thermo Fisher Scientific', 'RTX (Raytheon Technologies)'
])

for (const a of accounts) {
  const { data: briefs } = await sb.from('positioning_briefs').select('*').eq('account_id', a.id).order('generated_at', { ascending: false }).limit(1)
  const b = briefs?.[0]
  if (!b) continue

  console.log(`====== ${a.name} ======`)
  console.log(`brief_id: ${b.id}  approved: ${b.approved}`)

  console.log('\n-- positioning_statement.because --')
  console.log(b.positioning_statement?.because || '')

  console.log('\n-- proof_points --')
  for (const [i, p] of (b.proof_points ?? []).entries()) {
    console.log(`  [${i}] ${p}`)
  }

  // Look for named-entity claims inside personas + objections too
  console.log('\n-- persona_messages (strings containing named brands) --')
  for (const [k, v] of Object.entries(b.persona_messages ?? {})) {
    // flag mentions of any brand name (rough heuristic)
    const brands = /Moderna|Takeda|AstraZeneca|Merck|J&J|Johnson & Johnson|DePuy|Dentsply|Pfizer|Mitsubishi|Lonza|Amgen|GSK|GlaxoSmithKline|Novartis|Sanofi|Terex|Delta Faucet|Outset|Stanley Black|DMG Mori|Boeing|Airbus|Lockheed|Northrop|General Dynamics|Pratt|P&W|Whirlpool|Desktop Metal|Ethicon|Kinney/gi
    const hits = String(v).match(brands)
    if (hits) {
      console.log(`  [${k}] brands mentioned: ${[...new Set(hits)].join(', ')}`)
    }
  }

  console.log('\n-- objection_handlers (strings containing named brands) --')
  for (const [i, o] of (b.objection_handlers ?? []).entries()) {
    const hits = String(o.response).match(/Moderna|Takeda|AstraZeneca|Merck|J&J|Johnson & Johnson|DePuy|Dentsply|Pfizer|Mitsubishi|Lonza|Amgen|GSK|Siemens|Körber|Rockwell|Plex|SAP|Oracle|Delmia|MasterControl|Boeing|Airbus|Lockheed|Northrop|General Dynamics|Pratt|P&W|Whirlpool|Ethicon/gi)
    if (hits) {
      console.log(`  [${i}] brands in response: ${[...new Set(hits)].join(', ')}`)
    }
  }
  console.log('')
}
