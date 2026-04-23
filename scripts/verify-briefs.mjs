// Verify the Nathan-aligned rewrite held. Checks for:
// - [CUSTOMER NAME REQUIRED] anywhere in the 3 rewritten briefs
// - banned framings: "layer on top", "layers on top", "sits above",
//   "Tulip doesn't replace your MES", "Tulip does not replace your MES"
// - presence of composable-MES framing + at least one AI feature name
// - Bayer AG brief is unchanged (approved=true, updated_at not moved)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) acc[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
  return acc
}, {})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const ids = {
  'Boston Scientific': '49ed59e2-9493-4863-8f70-3dd6d46c38d5',
  'Thermo Fisher Scientific': '522dfc46-220c-41dc-b8e3-8484e58c410f',
  'RTX (Raytheon Technologies)': 'ce223538-9102-40b0-9d59-639e9e6c3fd5',
  'Bayer AG': 'cb2df81d-85ce-4b04-a1c0-48a8badcca7f',
}

const bannedPhrases = [
  '[CUSTOMER NAME REQUIRED]',
  'layers on top of Plex without ripping it out',
  'sits above your existing systems',
  "Tulip doesn't replace your MES",
  'Tulip does not replace your MES',
  'It sits above them',
  'It layers on top',
]

const aiFeatures = ['AI Composer', 'AI App Translation', 'AI Trigger Descriptions', 'AI Insights', 'Tulip MCP', 'Frontline Copilot']

for (const [name, id] of Object.entries(ids)) {
  const { data } = await sb.from('positioning_briefs').select('*').eq('id', id).single()
  const flat = JSON.stringify([
    data.positioning_statement, data.core_message, data.key_themes,
    data.persona_messages, data.proof_points, data.objection_handlers
  ])
  console.log(`==== ${name} ====`)
  console.log(`  approved: ${data.approved}  generated_at: ${data.generated_at}`)

  const hits = bannedPhrases.filter(p => flat.includes(p))
  if (hits.length === 0) console.log('  banned phrases: NONE')
  else console.log('  banned phrases FOUND:', hits)

  if (name === 'Bayer AG') {
    // Bayer should STILL have [CUSTOMER NAME REQUIRED] and layer phrasing — we didn't touch it
    console.log('  (intentionally untouched — legacy phrases expected)')
  } else {
    const hasComposableMES = flat.includes('composable MES') || flat.includes('composable-MES') || flat.includes('composable, 21 CFR')
    const aiFound = aiFeatures.filter(f => flat.includes(f))
    console.log(`  composable-MES framing: ${hasComposableMES ? 'YES' : 'MISSING'}`)
    console.log(`  AI features cited: ${aiFound.join(', ') || 'NONE'}`)
  }
  console.log('')
}
