import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { exchangeCodeForTokens } from '@/lib/salesforce'

// GET /api/integrations/salesforce/callback
// Completes the OAuth flow: exchange code → tokens, fetch identity, persist, redirect.
// SF's token response does not include expires_in, so we assume a 2h TTL.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!code) {
    return NextResponse.redirect(new URL('/settings/integrations?salesforce=error', appUrl))
  }

  let token: Awaited<ReturnType<typeof exchangeCodeForTokens>>
  try {
    token = await exchangeCodeForTokens(code)
  } catch {
    return NextResponse.redirect(new URL('/settings/integrations?salesforce=token_error', appUrl))
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

  // Fetch display name from the identity URL SF returned.
  let identity: string | null = null
  try {
    const idRes = await fetch(token.id, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    if (idRes.ok) {
      const info = (await idRes.json()) as { display_name?: string; username?: string; email?: string }
      identity = info.display_name ?? info.username ?? info.email ?? null
    }
  } catch {
    // non-fatal
  }

  await getSupabase().from('app_settings').update({
    salesforce_instance_url: token.instance_url,
    salesforce_access_token: token.access_token,
    salesforce_refresh_token: token.refresh_token ?? null,
    salesforce_token_expires_at: expiresAt,
    salesforce_identity: identity,
    salesforce_last_sync_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  return NextResponse.redirect(new URL('/settings/integrations?salesforce=connected', appUrl))
}
