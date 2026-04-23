import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// GET /api/integrations/zoominfo/status
// No secrets in the response — just enough for the settings card to show state.
export async function GET() {
  const { data: settings } = await getSupabase()
    .from('app_settings')
    .select('zoominfo_username, zoominfo_client_id, zoominfo_private_key, zoominfo_token_expires_at, zoominfo_last_sync_at, zoominfo_last_sync_error')
    .eq('id', 1)
    .single()

  const hasCreds = !!(settings?.zoominfo_username && settings?.zoominfo_client_id && settings?.zoominfo_private_key)
  const tokenExpiresAt = settings?.zoominfo_token_expires_at ?? null
  const tokenValid = tokenExpiresAt ? new Date(tokenExpiresAt).getTime() > Date.now() : false

  return NextResponse.json({
    connected: hasCreds && tokenValid,
    username: settings?.zoominfo_username ?? null,
    last_sync_at: settings?.zoominfo_last_sync_at ?? null,
    last_sync_error: settings?.zoominfo_last_sync_error ?? null,
    token_expires_at: tokenExpiresAt,
  })
}
