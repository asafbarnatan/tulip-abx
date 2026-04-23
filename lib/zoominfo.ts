import { createSign } from 'node:crypto'
import { getSupabase } from '@/lib/supabase'

// ZoomInfo authenticates with an RS256-signed JWT minted from a user-provided private key.
// We exchange that JWT for a bearer access token (~1h TTL) and cache it in app_settings.
// Signing is done with node:crypto so we don't pull in a JWT dep.

const AUTH_URL = 'https://api.zoominfo.com/authenticate'
const SEARCH_COMPANY_URL = 'https://api.zoominfo.com/search/company'
const ENRICH_COMPANY_URL = 'https://api.zoominfo.com/enrich/company'
const SEARCH_INTENT_URL = 'https://api.zoominfo.com/search/intent'

// Refresh tokens a bit before ZoomInfo's stated expiry to avoid clock-skew 401s.
const TOKEN_REFRESH_SKEW_MS = 60_000

export interface EnrichedCompany {
  id: string
  name: string | null
  website: string | null
  employees: number | null
  revenue: string | null
  industry: string | null
  headquarters: string | null
  ticker: string | null
  description: string | null
}

export interface IntentSignal {
  topic: string
  score: number // normalized 0-100
  category: string | null
  detected_at: string // ISO timestamp
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

// Minimal RS256 JWT signer — header + claims, signed with a PEM-encoded RSA private key.
function signJwtRS256(claims: Record<string, unknown>, privateKeyPem: string): string {
  const header = { alg: 'RS256', typ: 'JWT' }
  const encHeader = base64url(JSON.stringify(header))
  const encPayload = base64url(JSON.stringify(claims))
  const signingInput = `${encHeader}.${encPayload}`
  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const signature = signer.sign(privateKeyPem)
  return `${signingInput}.${base64url(signature)}`
}

async function recordSyncError(message: string): Promise<void> {
  try {
    await getSupabase().from('app_settings').update({
      zoominfo_last_sync_error: message,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
  } catch {
    // swallow — logging failure shouldn't mask the original error
  }
}

async function clearSyncError(): Promise<void> {
  try {
    await getSupabase().from('app_settings').update({
      zoominfo_last_sync_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
  } catch {
    // non-fatal
  }
}

// Returns a valid bearer token or null if creds are missing / auth fails.
// On auth failure, writes the error message to zoominfo_last_sync_error.
export async function getZoomInfoAccessToken(): Promise<string | null> {
  const { data: settings } = await getSupabase()
    .from('app_settings')
    .select('zoominfo_username, zoominfo_client_id, zoominfo_private_key, zoominfo_access_token, zoominfo_token_expires_at')
    .eq('id', 1)
    .single()

  if (!settings?.zoominfo_username || !settings?.zoominfo_client_id || !settings?.zoominfo_private_key) {
    return null
  }

  // Reuse cached token if it's still fresh.
  if (settings.zoominfo_access_token && settings.zoominfo_token_expires_at) {
    const expiresAt = new Date(settings.zoominfo_token_expires_at).getTime()
    if (expiresAt - TOKEN_REFRESH_SKEW_MS > Date.now()) {
      return settings.zoominfo_access_token
    }
  }

  const now = Math.floor(Date.now() / 1000)
  const jwt = signJwtRS256(
    {
      iss: settings.zoominfo_client_id,
      username: settings.zoominfo_username,
      iat: now,
      exp: now + 15 * 60,
    },
    settings.zoominfo_private_key,
  )

  let res: Response
  try {
    res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: settings.zoominfo_client_id, username: settings.zoominfo_username, token: jwt }),
    })
  } catch (e) {
    await recordSyncError(`ZoomInfo auth network error: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    await recordSyncError(`ZoomInfo auth failed (${res.status}): ${body.slice(0, 500)}`)
    return null
  }

  const json = (await res.json().catch(() => null)) as { jwt?: string; accessToken?: string; expiresIn?: number } | null
  const token = json?.accessToken ?? json?.jwt
  if (!token) {
    await recordSyncError('ZoomInfo auth returned no token')
    return null
  }

  // ZoomInfo tokens are valid ~1h; trust the response's expiresIn if given, else default to 55 min.
  const ttlMs = (json?.expiresIn ?? 3300) * 1000
  const expiresAt = new Date(Date.now() + ttlMs).toISOString()

  await getSupabase().from('app_settings').update({
    zoominfo_access_token: token,
    zoominfo_token_expires_at: expiresAt,
    zoominfo_last_sync_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  return token
}

async function callZoomInfo<T>(url: string, body: unknown): Promise<T | null> {
  const token = await getZoomInfoAccessToken()
  if (!token) return null

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    await recordSyncError(`ZoomInfo request error (${url}): ${e instanceof Error ? e.message : String(e)}`)
    return null
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    await recordSyncError(`ZoomInfo ${url} failed (${res.status}): ${text.slice(0, 500)}`)
    return null
  }

  return (await res.json().catch(() => null)) as T | null
}

export async function zoomInfoSearchCompany(name: string): Promise<{ id: string; name: string } | null> {
  if (!name?.trim()) return null
  const json = await callZoomInfo<{ data?: Array<{ id: string | number; name: string }> }>(
    SEARCH_COMPANY_URL,
    { companyName: name, rpp: 5, page: 1 },
  )
  const hit = json?.data?.[0]
  if (!hit) return null
  await clearSyncError()
  return { id: String(hit.id), name: hit.name }
}

interface RawEnrichedCompany {
  id?: string | number
  name?: string
  website?: string
  employeeCount?: number
  revenue?: string | number
  industry?: string
  primaryIndustry?: string
  street?: string
  city?: string
  state?: string
  country?: string
  ticker?: string
  description?: string
}

export async function zoomInfoEnrichCompany(companyId: string): Promise<EnrichedCompany | null> {
  if (!companyId) return null
  const json = await callZoomInfo<{ data?: { result?: Array<{ data?: RawEnrichedCompany[] }> } | RawEnrichedCompany[] }>(
    ENRICH_COMPANY_URL,
    { matchCompanyInput: [{ companyId }], outputFields: ['id', 'name', 'website', 'employeeCount', 'revenue', 'industry', 'primaryIndustry', 'street', 'city', 'state', 'country', 'ticker', 'description'] },
  )

  // ZoomInfo's response shape is { data: { result: [ { data: [ company ] } ] } } on enrich.
  // Fall back to treating data as a flat array if the API ever simplifies.
  const raw: RawEnrichedCompany | undefined = Array.isArray(json?.data)
    ? json.data[0]
    : json?.data?.result?.[0]?.data?.[0]
  if (!raw) return null

  const hq = [raw.city, raw.state, raw.country].filter(Boolean).join(', ') || null
  const enriched: EnrichedCompany = {
    id: String(raw.id ?? companyId),
    name: raw.name ?? null,
    website: raw.website ?? null,
    employees: typeof raw.employeeCount === 'number' ? raw.employeeCount : null,
    revenue: raw.revenue != null ? String(raw.revenue) : null,
    industry: raw.primaryIndustry ?? raw.industry ?? null,
    headquarters: hq,
    ticker: raw.ticker ?? null,
    description: raw.description ?? null,
  }
  await clearSyncError()
  return enriched
}

interface RawIntentTopic {
  topic?: string
  topicName?: string
  signalScore?: number
  score?: number
  category?: string
  signalDate?: string
  date?: string
}

export async function zoomInfoFetchIntentSignals(companyId: string): Promise<IntentSignal[]> {
  if (!companyId) return []
  const json = await callZoomInfo<{ data?: Array<{ topics?: RawIntentTopic[] }> | RawIntentTopic[] }>(
    SEARCH_INTENT_URL,
    { companyId, rpp: 25, page: 1 },
  )
  if (!json?.data) return []

  // Response variants: either a flat list of topic rows or company-grouped rows with a topics[] array.
  const rawTopics: RawIntentTopic[] = Array.isArray(json.data) && json.data.length > 0 && 'topics' in (json.data[0] as object)
    ? (json.data as Array<{ topics?: RawIntentTopic[] }>).flatMap(r => r.topics ?? [])
    : (json.data as RawIntentTopic[])

  const signals: IntentSignal[] = rawTopics.map(t => {
    const rawScore = typeof t.signalScore === 'number' ? t.signalScore : (typeof t.score === 'number' ? t.score : 0)
    // ZoomInfo signalScore is 0-100 already; clamp defensively.
    const score = Math.max(0, Math.min(100, Math.round(rawScore)))
    const detected = t.signalDate ?? t.date ?? new Date().toISOString()
    return {
      topic: t.topicName ?? t.topic ?? 'Unknown topic',
      score,
      category: t.category ?? null,
      detected_at: new Date(detected).toISOString(),
    }
  }).filter(s => s.topic !== 'Unknown topic' || s.score > 0)

  await clearSyncError()
  return signals
}
