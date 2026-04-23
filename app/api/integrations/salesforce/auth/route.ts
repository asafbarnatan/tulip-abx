import { NextResponse } from 'next/server'
import { getSalesforceAuthUrl } from '@/lib/salesforce'

// GET /api/integrations/salesforce/auth
// Kicks off the Salesforce OAuth 2.0 Web Server flow. If SF creds are missing,
// redirects back to settings with a flag so the UI can explain what to do.
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const authUrl = await getSalesforceAuthUrl(`sf.${Math.random().toString(36).slice(2)}`)
  if (!authUrl) {
    return NextResponse.redirect(new URL('/settings/integrations?salesforce=missing_credentials', appUrl))
  }

  return NextResponse.redirect(authUrl)
}
