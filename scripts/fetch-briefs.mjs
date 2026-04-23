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

const { data: accounts, error: aErr } = await sb.from('accounts').select('id,name').in('name', [
  'Boston Scientific', 'Thermo Fisher Scientific', 'RTX (Raytheon Technologies)', 'Bayer AG'
])
if (aErr) { console.error(aErr); process.exit(1) }

for (const a of accounts) {
  const { data: briefs } = await sb.from('positioning_briefs')
    .select('*').eq('account_id', a.id).order('generated_at', { ascending: false }).limit(1)
  const b = briefs?.[0]
  console.log('====', a.name, '====')
  console.log('account_id:', a.id)
  console.log('brief_id:', b?.id, 'approved:', b?.approved, 'generated_at:', b?.generated_at)
  console.log('--- positioning_statement ---')
  console.log(JSON.stringify(b?.positioning_statement, null, 2))
  console.log('--- core_message ---')
  console.log(String(b?.core_message || ''))
  console.log('--- key_themes ---')
  console.log(JSON.stringify(b?.key_themes, null, 2))
  console.log('--- persona_messages ---')
  console.log(JSON.stringify(b?.persona_messages, null, 2))
  console.log('--- proof_points ---')
  console.log(JSON.stringify(b?.proof_points, null, 2))
  console.log('--- objection_handlers ---')
  console.log(JSON.stringify(b?.objection_handlers, null, 2))
  console.log('')
}
