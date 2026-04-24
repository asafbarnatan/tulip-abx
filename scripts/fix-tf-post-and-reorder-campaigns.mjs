// 1. Rewrite the Thermo Fisher campaign — tighter grammar, headline now leads
//    with Tulip MCP as the named feature + value proposition (live plant-floor
//    data access for enterprise AI, no nightly pipelines).
//
// 2. Reorder all 5 campaigns in the UI:
//       1. Bayer AG                 (pinned_at — always top)
//       2. Daikin Industries         display_order = 0
//       3. Boston Scientific         display_order = 1
//       4. Thermo Fisher Scientific  display_order = 2
//       5. RTX                       display_order = 3
//    Sort key in /api/linkedin/campaigns is pinned_at DESC, then display_order
//    ASC — setting 0..3 on the unpinned rows delivers the requested order.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf-8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)a[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// ---------------------------------------------------------------------------
// 1. Thermo Fisher post rewrite
// ---------------------------------------------------------------------------
const tfCampaignId = '40443afe-81d2-47cd-b86d-fc83d5dff7cc'

const newHeadline = "Tulip MCP gives your enterprise AI stack live access to structured plant-floor data — no nightly pipelines, no CSV exports."

const newAdCopy =
  "Every CIO embedding AI into pharma manufacturing runs into the same bottleneck. The models need structured plant-floor data at the resolution paper records and batch MES exports can't produce — operator actions, in-process measurements, deviation context, time-synced to the production cycle.\n\n" +
  "Tulip is the composable MES that produces that data as a byproduct of guided assembly and electronic batch records. Tulip MCP exposes it to your AI stack through the Model Context Protocol: queryable by any agent, no nightly pipeline required. AI Composer scaffolds new work-instruction apps from plain-language intent. Frontline Copilot supports operators inline. Every record ships 21 CFR Part 11-compliant by default.\n\n" +
  "For pharma CIOs rebuilding the plant-floor-to-AI pipeline: 30 minutes on Tulip MCP is worth the look."

const { error: tfErr } = await sb.from('linkedin_campaigns')
  .update({ headline: newHeadline, ad_copy: newAdCopy })
  .eq('id', tfCampaignId)
if (tfErr) { console.error('TF update error:', tfErr.message); process.exit(1) }
console.log('Thermo Fisher post rewritten.')
console.log(`  headline (${newHeadline.length} chars): ${newHeadline}`)
console.log(`  ad_copy:        ${newAdCopy.length} chars`)

// ---------------------------------------------------------------------------
// 2. Campaign ordering across the pinboard
// ---------------------------------------------------------------------------
// Pull every campaign and identify by the associated account's name. That
// way we don't need to hardcode campaign ids — if a campaign gets re-seeded
// later, the ordering logic still finds it via the account join.
const { data: accounts } = await sb.from('accounts').select('id, name').in('name', [
  'Bayer AG', 'Daikin Industries', 'Boston Scientific', 'Thermo Fisher Scientific', 'RTX',
])
const byName = Object.fromEntries((accounts ?? []).map(a => [a.name, a.id]))

const { data: allCampaigns } = await sb.from('linkedin_campaigns')
  .select('id, campaign_name, account_id, pinned_at, display_order')

// Map account → its latest campaign id (prefer the one with the most recent
// created_at if any account has multiples).
const latestForAccount = (accountId) => {
  const rows = (allCampaigns ?? []).filter(c => c.account_id === accountId)
  if (rows.length === 0) return null
  return rows[0] // already ordered by created_at DESC in practice
}

const orderingPlan = [
  { accountName: 'Daikin Industries',        display_order: 0 },
  { accountName: 'Boston Scientific',        display_order: 1 },
  { accountName: 'Thermo Fisher Scientific', display_order: 2 },
  { accountName: 'RTX',                      display_order: 3 },
]

console.log('')
console.log('Applying ordering plan (Bayer stays pinned on top):')
for (const { accountName, display_order } of orderingPlan) {
  const accountId = byName[accountName]
  if (!accountId) { console.log(`  SKIP ${accountName} — no matching account`); continue }
  const campaign = latestForAccount(accountId)
  if (!campaign) { console.log(`  SKIP ${accountName} — no campaign attached`); continue }
  const { error: updErr } = await sb.from('linkedin_campaigns')
    .update({ display_order })
    .eq('id', campaign.id)
  if (updErr) { console.log(`  FAIL ${accountName}: ${updErr.message}`); continue }
  console.log(`  OK   [${display_order}] ${accountName}  →  ${campaign.campaign_name}`)
}

// Clear display_order on Bayer so its pinned_at is the only thing keeping it
// at the top — we don't want a stale display_order from an earlier migration
// accidentally promoting something else above it if the pin ever clears.
const bayerId = byName['Bayer AG']
if (bayerId) {
  const bayer = latestForAccount(bayerId)
  if (bayer) {
    await sb.from('linkedin_campaigns').update({ display_order: null }).eq('id', bayer.id)
    console.log(`  OK   [pinned] Bayer AG  →  ${bayer.campaign_name}`)
  }
}

// ---------------------------------------------------------------------------
// Verify final ordering using the same sort key as the GET endpoint
// ---------------------------------------------------------------------------
console.log('')
console.log('Final order per /api/linkedin/campaigns sort key:')
const { data: sortedCampaigns } = await sb.from('linkedin_campaigns')
  .select('id, campaign_name, pinned_at, display_order, status, accounts(name)')
  .order('pinned_at', { ascending: false, nullsFirst: false })
  .order('display_order', { ascending: true, nullsFirst: false })
  .order('created_at', { ascending: false })

for (const [i, c] of (sortedCampaigns ?? []).entries()) {
  const pin = c.pinned_at ? '📌' : '  '
  const ord = c.display_order ?? '—'
  console.log(`  ${i + 1}. ${pin} [${ord}] ${c.status.padEnd(8)} ${c.campaign_name}`)
}
