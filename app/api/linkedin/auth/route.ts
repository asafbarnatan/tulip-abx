import { NextRequest, NextResponse } from 'next/server'

// Two scope profiles:
// - "signin": openid/profile/email. Always available to any LinkedIn app.
// - "ads":    adds r_ads + r_ads_reporting + rw_ads. Requires Marketing Developer
//             Platform approval on the LinkedIn app. If the app isn't approved,
//             LinkedIn returns "invalid_scope" and auth fails — so we default
//             to signin unless the caller explicitly asks for ads scopes.
//
// To upgrade: request ?scope=ads from /api/linkedin/auth (set LINKEDIN_SCOPE=ads
// as env var to make it default). If it fails, we fall back to signin-only.
export async function GET(request: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI ?? 'http://localhost:3000/api/linkedin/callback'

  if (!clientId) {
    return NextResponse.redirect(new URL('/mission-control?linkedin=missing_credentials', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }

  const requested = request.nextUrl.searchParams.get('scope') ?? process.env.LINKEDIN_SCOPE ?? 'signin'
  const scopeProfile = requested === 'ads' ? 'ads' : 'signin'

  const scopeList = scopeProfile === 'ads'
    ? ['openid', 'profile', 'email', 'r_ads', 'r_ads_reporting', 'rw_ads']
    : ['openid', 'profile', 'email']

  const state = `${scopeProfile}.${Math.random().toString(36).slice(2)}`

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', scopeList.join(' '))
  url.searchParams.set('state', state)

  return NextResponse.redirect(url)
}
