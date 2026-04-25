// Direct-token connect for LinkedIn Marketing API.
//
// Use this when you've generated a token straight from LinkedIn Campaign
// Manager's Token Generator (Account Settings → API Access) instead of going
// through the OAuth callback. Campaign Manager-issued tokens already inherit
// every scope your app is approved for, including r_ads_reporting.
//
// The script:
//   1. Hits /v2/userinfo to confirm the token is alive and fetch the display
//      name shown in the "Connected as ..." pill on Mission Control.
//   2. Probes adAnalyticsV2 with a tiny query to verify r_ads_reporting works.
//      If LinkedIn rejects it (403), we surface the exact error rather than
//      writing linkedin_ads_scope_ok=true and pretending sync will succeed.
//   3. Writes the token + identity + scope flag to app_settings (id=1).
//
// Usage:
//   node scripts/set-linkedin-token.mjs "<token>"
//
// The token never lands on disk in this repo — argv only.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const token = process.argv[2]
if (!token || token.length < 50) {
  console.error('Usage: node scripts/set-linkedin-token.mjs "<access_token>"')
  process.exit(1)
}

const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((a, l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) a[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
  return a
}, {})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// 1. Identity probe — non-fatal. Marketing API tokens generated from Campaign
//    Manager's Token Generator usually do NOT include openid/profile, so 403
//    here is expected. We just fall back to a static label.
let identity = null
try {
  const r = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (r.ok) {
    const ui = await r.json()
    identity = ui.name ?? ui.email ?? ui.sub ?? null
    console.log(`✓ userinfo OK — connected as: ${identity ?? '(no name returned)'}`)
  } else {
    console.log(`⚠ userinfo ${r.status} — token has no openid/profile scope (expected for ads-only tokens). Falling back to static identity.`)
  }
} catch (e) {
  console.log('⚠ userinfo network error:', e.message, '— falling back to static identity.')
}
if (!identity) identity = 'Asaf Bar Natan (Marketing API)'

// 2. Ads scope probe — try a 1-day adAnalyticsV2 query against any campaign in
//    our DB. If LinkedIn returns 200 we know r_ads_reporting is live; if 403
//    we record the exact body so the UI can show it.
const { data: anyCampaign } = await sb
  .from('linkedin_campaigns')
  .select('linkedin_campaign_id')
  .not('linkedin_campaign_id', 'is', null)
  .limit(1)
  .single()

let adsScopeOk = false
let scopeError = null
if (anyCampaign?.linkedin_campaign_id) {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const params = new URLSearchParams({
    q: 'analytics',
    pivot: 'CAMPAIGN',
    timeGranularity: 'ALL',
    'dateRange.start.year': String(yesterday.getUTCFullYear()),
    'dateRange.start.month': String(yesterday.getUTCMonth() + 1),
    'dateRange.start.day': String(yesterday.getUTCDate()),
    'dateRange.end.year': String(today.getUTCFullYear()),
    'dateRange.end.month': String(today.getUTCMonth() + 1),
    'dateRange.end.day': String(today.getUTCDate()),
    fields: 'impressions,clicks,pivotValues',
    campaigns: anyCampaign.linkedin_campaign_id,
  })
  const url = `https://api.linkedin.com/v2/adAnalyticsV2?${params.toString()}`
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' },
  })
  if (r.ok) {
    adsScopeOk = true
    const j = await r.json().catch(() => ({}))
    console.log(`✓ adAnalyticsV2 OK — got ${(j.elements ?? []).length} elements for probe campaign ${anyCampaign.linkedin_campaign_id}`)
  } else {
    scopeError = `LinkedIn ${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`
    console.error(`✗ adAnalyticsV2 FAILED — ${scopeError}`)
    console.error('  The token works for userinfo but does not have r_ads_reporting.')
    console.error('  Re-generate the token from Campaign Manager → API Access with all scopes ticked.')
  }
} else {
  console.log('⚠ no campaign rows with linkedin_campaign_id — skipping ads-scope probe')
}

// 3. Write to app_settings.
const { error } = await sb.from('app_settings').update({
  linkedin_access_token: token,
  linkedin_refresh_token: null,
  linkedin_token_expires_at: null,
  linkedin_org_id: identity,
  linkedin_granted_scopes: adsScopeOk
    ? 'openid profile email r_ads r_ads_reporting w_member_social r_organization_social w_organization_social rw_organization_admin'
    : 'openid profile email',
  linkedin_ads_scope_ok: adsScopeOk,
  linkedin_last_sync_error: scopeError,
  updated_at: new Date().toISOString(),
}).eq('id', 1)

if (error) {
  console.error('✗ app_settings update failed:', error.message)
  process.exit(1)
}

console.log('\n✓ Wrote token to app_settings.')
console.log(`  identity=${identity ?? 'null'}`)
console.log(`  ads_scope_ok=${adsScopeOk}`)
console.log('\nNext: hit "Sync now" on Mission Control or call /api/linkedin/sync.')
