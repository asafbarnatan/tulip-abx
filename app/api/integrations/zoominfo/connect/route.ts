import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getZoomInfoAccessToken } from '@/lib/zoominfo'

// POST /api/integrations/zoominfo/connect
// Body: { username, client_id, private_key }
// Persists the creds, then immediately mints a token to validate them.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { username?: string; client_id?: string; private_key?: string } | null
  const username = body?.username?.trim()
  const clientId = body?.client_id?.trim()
  const privateKey = body?.private_key?.trim()

  if (!username || !clientId || !privateKey) {
    return NextResponse.json({ error: 'username, client_id, and private_key are all required' }, { status: 400 })
  }

  // Persist the creds first so getZoomInfoAccessToken() can read them.
  // Wipe any cached token/expiry so the next call definitely re-auths.
  const { error: upsertError } = await getSupabase().from('app_settings').update({
    zoominfo_username: username,
    zoominfo_client_id: clientId,
    zoominfo_private_key: privateKey,
    zoominfo_access_token: null,
    zoominfo_token_expires_at: null,
    zoominfo_last_sync_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  if (upsertError) {
    return NextResponse.json({ error: `Could not save credentials: ${upsertError.message}` }, { status: 500 })
  }

  const token = await getZoomInfoAccessToken()
  if (!token) {
    const { data: settings } = await getSupabase()
      .from('app_settings')
      .select('zoominfo_last_sync_error')
      .eq('id', 1)
      .single()
    return NextResponse.json(
      { error: settings?.zoominfo_last_sync_error ?? 'ZoomInfo authentication failed' },
      { status: 401 },
    )
  }

  return NextResponse.json({ connected: true, identity: username })
}
