import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!code) {
    return NextResponse.redirect(new URL('/mission-control?linkedin=error', appUrl))
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI ?? `${appUrl}/api/linkedin/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/mission-control?linkedin=missing_credentials', appUrl))
  }

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/mission-control?linkedin=token_error', appUrl))
  }

  const token = await tokenRes.json()
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()

  // LinkedIn returns the scope string it actually granted — this may be smaller than
  // what we asked for (e.g. we requested r_ads_reporting but the app isn't approved
  // for Marketing API → LinkedIn silently drops that scope). Parse and persist so the
  // analytics sync can choose to call adAnalyticsV2 only when the scope is present.
  const grantedScopes: string = typeof token.scope === 'string' ? token.scope : ''
  const hasAdsReporting = /\br_ads_reporting\b/.test(grantedScopes)

  // Fetch the authenticated user's profile (OIDC userinfo endpoint) to display "Connected as ..."
  let userinfo: { name?: string; email?: string; sub?: string } = {}
  try {
    const uiRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    if (uiRes.ok) userinfo = await uiRes.json()
  } catch {
    // non-fatal
  }

  await getSupabase().from('app_settings').update({
    linkedin_access_token: token.access_token,
    linkedin_refresh_token: token.refresh_token ?? null,
    linkedin_token_expires_at: expiresAt,
    // Reuse linkedin_org_id as a generic "linkedin_identity" slot — store the display name for the UI.
    linkedin_org_id: userinfo.name ?? userinfo.email ?? null,
    linkedin_granted_scopes: grantedScopes || null,
    linkedin_ads_scope_ok: hasAdsReporting,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  return NextResponse.redirect(new URL('/mission-control?linkedin=connected', appUrl))
}
