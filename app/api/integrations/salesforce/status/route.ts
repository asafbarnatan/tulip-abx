import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// GET /api/integrations/salesforce/status
// No secrets in the response — just enough state for the settings card.
export async function GET() {
  const { data: settings } = await getSupabase()
    .from('app_settings')
    .select('salesforce_access_token, salesforce_instance_url, salesforce_identity, salesforce_token_expires_at, salesforce_last_sync_at, salesforce_last_sync_error')
    .eq('id', 1)
    .single()

  return NextResponse.json({
    connected: !!settings?.salesforce_access_token,
    identity: settings?.salesforce_identity ?? null,
    instance_url: settings?.salesforce_instance_url ?? null,
    token_expires_at: settings?.salesforce_token_expires_at ?? null,
    last_sync_at: settings?.salesforce_last_sync_at ?? null,
    last_sync_error: settings?.salesforce_last_sync_error ?? null,
  })
}
