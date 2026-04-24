import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const id = '0b322ff0-0961-4d0e-b852-e8f2ae256c0e'
const { data: acct } = await sb.from('accounts').select('*').eq('id', id).single()

console.log('ALL FIELDS (any containing "customer" or "existing" or "2 site" or "830"):')
for (const [k, v] of Object.entries(acct)) {
  if (typeof v === 'string' && /customer|existing|2.site|2-site|830/i.test(v)) {
    console.log(`\n  [${k}]:`)
    console.log(`    ${v}`)
  }
}

console.log('\n\nSIGNALS with customer/existing/2-site/830 content:')
const { data: signals } = await sb.from('signals').select('*').eq('account_id', id)
for (const s of signals ?? []) {
  if (/customer|existing|2.site|2-site|830/i.test(s.content ?? '')) {
    console.log(`\n  [${s.signal_type}] processed=${s.processed}:`)
    console.log(`    ${s.content}`)
  }
}
