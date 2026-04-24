import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Clear every existing pin first — single-pinned-at-a-time invariant.
const { error: clearErr } = await sb.from('linkedin_campaigns').update({ pinned_at: null }).not('pinned_at', 'is', null)
if (clearErr) { console.error('clear error:', clearErr.message); process.exit(1) }

// Find Bayer campaign id
const { data: rows, error: findErr } = await sb
  .from('linkedin_campaigns')
  .select('id, campaign_name, linkedin_campaign_id')
  .ilike('campaign_name', '%bayer%')

if (findErr) { console.error('find error:', findErr.message); process.exit(1) }
if (!rows?.length) { console.error('no Bayer campaign found'); process.exit(1) }

// Prefer the LIVE one if multiple match
const bayer = rows.find(r => /^\d+$/.test(r.linkedin_campaign_id ?? '')) ?? rows[0]
console.log('pinning:', bayer.campaign_name, bayer.id)

const { error: pinErr } = await sb
  .from('linkedin_campaigns')
  .update({ pinned_at: new Date().toISOString() })
  .eq('id', bayer.id)
if (pinErr) { console.error('pin error:', pinErr.message); process.exit(1) }

console.log('done')
