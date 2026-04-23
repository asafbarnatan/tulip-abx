import { getSupabase } from '@/lib/supabase'

// Salesforce OAuth 2.0 Web Server flow.
// SF tokens don't return an `expires_in` — orgs default to a 2h session timeout, so we
// assume 2h and refresh on 401 or when our stored expiry is past.

const API_VERSION = 'v60.0'
const TOKEN_REFRESH_SKEW_MS = 60_000

// SF access tokens don't expose a lifetime in the response; assume 2h to be safe.
const DEFAULT_TOKEN_TTL_MS = 2 * 60 * 60 * 1000

export interface SalesforceTokenResponse {
  access_token: string
  refresh_token?: string
  instance_url: string
  id: string // identity URL to fetch user info from
  token_type?: string
  issued_at?: string
  signature?: string
  scope?: string
}

export interface SalesforceAccount {
  Id: string
  Name: string | null
  Industry: string | null
  Website: string | null
  AnnualRevenue: number | null
}

export interface SalesforceOpportunity {
  Id: string
  Name: string | null
  StageName: string | null
  Amount: number | null
  CloseDate: string | null
  Probability: number | null
  Owner?: { Name?: string | null } | null
  LastModifiedDate: string | null
}

function getLoginUrl(): string {
  return process.env.SALESFORCE_LOGIN_URL ?? 'https://login.salesforce.com'
}

function getRedirectUri(): string {
  return process.env.SALESFORCE_REDIRECT_URI ?? 'http://localhost:3000/api/integrations/salesforce/callback'
}

// Escapes single quotes to prevent SOQL injection via user-supplied strings.
// SOQL uses backslash-escaping for quotes inside string literals.
export function escapeSoql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export async function getSalesforceAuthUrl(state?: string): Promise<string | null> {
  const clientId = process.env.SALESFORCE_CLIENT_ID
  if (!clientId) return null

  const url = new URL(`${getLoginUrl()}/services/oauth2/authorize`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getRedirectUri())
  url.searchParams.set('scope', 'api refresh_token')
  if (state) url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeCodeForTokens(code: string): Promise<SalesforceTokenResponse> {
  const clientId = process.env.SALESFORCE_CLIENT_ID
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Missing SALESFORCE_CLIENT_ID or SALESFORCE_CLIENT_SECRET')
  }

  const res = await fetch(`${getLoginUrl()}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Salesforce token exchange failed ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json() as Promise<SalesforceTokenResponse>
}

async function refreshAccessToken(refreshToken: string, instanceUrl: string): Promise<SalesforceTokenResponse | null> {
  const clientId = process.env.SALESFORCE_CLIENT_ID
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const res = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) return null
  return res.json() as Promise<SalesforceTokenResponse>
}

export async function getValidAccessToken(): Promise<{ token: string; instance_url: string } | null> {
  const sb = getSupabase()
  const { data: settings } = await sb
    .from('app_settings')
    .select('salesforce_access_token, salesforce_refresh_token, salesforce_instance_url, salesforce_token_expires_at')
    .eq('id', 1)
    .single()

  if (!settings?.salesforce_access_token || !settings.salesforce_instance_url) return null

  const expiresAt = settings.salesforce_token_expires_at ? new Date(settings.salesforce_token_expires_at).getTime() : 0
  const expired = !expiresAt || expiresAt - Date.now() < TOKEN_REFRESH_SKEW_MS

  if (expired && settings.salesforce_refresh_token) {
    const refreshed = await refreshAccessToken(settings.salesforce_refresh_token, settings.salesforce_instance_url)
    if (refreshed?.access_token) {
      const newExpiresAt = new Date(Date.now() + DEFAULT_TOKEN_TTL_MS).toISOString()
      await sb.from('app_settings').update({
        salesforce_access_token: refreshed.access_token,
        salesforce_instance_url: refreshed.instance_url ?? settings.salesforce_instance_url,
        salesforce_token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      }).eq('id', 1)
      return { token: refreshed.access_token, instance_url: refreshed.instance_url ?? settings.salesforce_instance_url }
    }
    // Refresh failed — record it and return null so callers fall back gracefully.
    await sb.from('app_settings').update({
      salesforce_last_sync_error: 'Refresh token invalid — please reconnect Salesforce.',
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
    return null
  }

  return { token: settings.salesforce_access_token, instance_url: settings.salesforce_instance_url }
}

export async function salesforceQuery<T = unknown>(soql: string): Promise<T[]> {
  const auth = await getValidAccessToken()
  if (!auth) return []

  const url = `${auth.instance_url}/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${auth.token}`, Accept: 'application/json' },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const sb = getSupabase()
    await sb.from('app_settings').update({
      salesforce_last_sync_error: `Salesforce query ${res.status}: ${body.slice(0, 300)}`,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
    return []
  }

  const payload = await res.json().catch(() => ({ records: [] })) as { records?: T[] }
  return payload.records ?? []
}

export async function salesforceSearchAccount(name: string): Promise<SalesforceAccount | null> {
  if (!name || !name.trim()) return null
  const safe = escapeSoql(name.trim())
  const soql = `SELECT Id, Name, Industry, Website, AnnualRevenue FROM Account WHERE Name LIKE '%${safe}%' LIMIT 5`
  const records = await salesforceQuery<SalesforceAccount>(soql)
  if (records.length === 0) return null

  // Prefer an exact case-insensitive name match if one exists, else first hit.
  const lower = name.trim().toLowerCase()
  const exact = records.find(r => (r.Name ?? '').toLowerCase() === lower)
  return exact ?? records[0]
}

export async function salesforceListOpportunities(sfAccountId: string): Promise<SalesforceOpportunity[]> {
  if (!sfAccountId) return []
  const safe = escapeSoql(sfAccountId)
  const soql = `SELECT Id, Name, StageName, Amount, CloseDate, Probability, Owner.Name, LastModifiedDate FROM Opportunity WHERE AccountId = '${safe}' ORDER BY LastModifiedDate DESC LIMIT 50`
  return salesforceQuery<SalesforceOpportunity>(soql)
}
