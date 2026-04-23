// Strip editorial TBD markers (`[SOFT — ...]`, `[PLACEHOLDER]`, `[TBD]`) from
// positioning_briefs for everyone EXCEPT Bayer AG — user reserved Bayer for a
// collaborative review pass.
//
// These brackets are internal AE notes, not customer copy. They leak into the
// read-only view today because the briefs render raw.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Strip `[SOFT ...]`, `[TBD ...]`, `[PLACEHOLDER ...]`, `[NEEDS ...]` — anywhere
// in the string. Clean up the resulting double-spaces and trailing punctuation.
function stripBrackets(s) {
  if (typeof s !== 'string') return s
  let out = s.replace(/\s*\[(?:SOFT|TBD|PLACEHOLDER|NEEDS)[^\]]*\]/gi, '')
  out = out.replace(/\s+/g, ' ').trim()
  // Collapse orphan punctuation left by the strip (e.g. " .")
  out = out.replace(/\s+([.,!?;:])/g, '$1')
  out = out.replace(/\.{2,}$/g, '.')
  // Ensure terminal punctuation on non-empty strings
  if (out && !/[.?!]$/.test(out)) out += '.'
  return out
}

function cleanValue(v) {
  if (typeof v === 'string') return stripBrackets(v)
  if (Array.isArray(v)) {
    return v.map(item => {
      if (typeof item === 'string') return stripBrackets(item)
      if (item && typeof item === 'object') {
        const out = {}
        for (const [k, val] of Object.entries(item)) out[k] = typeof val === 'string' ? stripBrackets(val) : val
        return out
      }
      return item
    }).filter(x => x !== '' && x != null)
  }
  if (v && typeof v === 'object') {
    const out = {}
    for (const [k, val] of Object.entries(v)) out[k] = typeof val === 'string' ? stripBrackets(val) : val
    return out
  }
  return v
}

const targetAccounts = ['Boston Scientific', 'Thermo Fisher Scientific', 'RTX (Raytheon Technologies)', 'Daikin Industries']

const { data: accounts } = await sb.from('accounts').select('id,name').in('name', targetAccounts)
if (!accounts?.length) { console.log('no accounts'); process.exit(1) }

for (const a of accounts) {
  const { data: briefs } = await sb.from('positioning_briefs')
    .select('*').eq('account_id', a.id).order('generated_at', { ascending: false }).limit(1)
  const b = briefs?.[0]
  if (!b) { console.log('no brief:', a.name); continue }

  const before = JSON.stringify([b.core_message, b.key_themes, b.persona_messages, b.proof_points, b.objection_handlers])
  const hadBrackets = /\[(?:SOFT|TBD|PLACEHOLDER|NEEDS)/i.test(before)

  const patch = {
    core_message: cleanValue(b.core_message),
    key_themes: cleanValue(b.key_themes),
    persona_messages: cleanValue(b.persona_messages),
    proof_points: cleanValue(b.proof_points),
    objection_handlers: cleanValue(b.objection_handlers),
    positioning_statement: cleanValue(b.positioning_statement),
  }

  const after = JSON.stringify([patch.core_message, patch.key_themes, patch.persona_messages, patch.proof_points, patch.objection_handlers])

  if (before === after) {
    console.log(`SKIP ${a.name} — no brackets found`)
    continue
  }

  const { error } = await sb.from('positioning_briefs').update(patch).eq('id', b.id)
  if (error) console.log(`FAIL ${a.name}: ${error.message}`)
  else console.log(`OK   ${a.name}${hadBrackets ? ' (brackets stripped)' : ''}`)
}
