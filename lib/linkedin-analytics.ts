import { getSupabase } from '@/lib/supabase'

export type LinkedInSyncResult = {
  synced: number
  skipped: number
  error?: string
  updated_campaign_ids: string[]
}

interface AnalyticsElement {
  pivotValues?: string[]
  impressions?: number
  clicks?: number
  costInLocalCurrency?: string | number
  externalWebsiteConversions?: number
}

/**
 * Fetch live impressions/clicks/cost from LinkedIn Marketing API's adAnalyticsV2 endpoint
 * and write them onto matching rows in `linkedin_campaigns`.
 *
 * Requires the `r_ads_reporting` OAuth scope. Without it, LinkedIn returns 403 and this
 * function writes the error to `app_settings.linkedin_last_sync_error` so the UI can
 * show a precise "scope upgrade required" message instead of a silent failure.
 */
export async function syncLinkedInAnalytics(accountId?: string | null): Promise<LinkedInSyncResult> {
  const sb = getSupabase()

  // Select * so missing columns (pre-migration) don't null out the whole row.
  const { data: settingsRaw } = await sb.from('app_settings').select('*').single()
  const settings = settingsRaw as Record<string, unknown> | null

  const accessToken = settings?.linkedin_access_token as string | undefined
  if (!accessToken) {
    return { synced: 0, skipped: 0, error: 'LinkedIn not connected', updated_campaign_ids: [] }
  }

  const adsScopeOk = settings?.linkedin_ads_scope_ok === true
  const grantedScopes = settings?.linkedin_granted_scopes as string | null | undefined
  if (!adsScopeOk) {
    const err = `Missing r_ads_reporting scope. Granted: ${grantedScopes ?? 'none (migration may not have run — see supabase/migrations/2026-04-22_integrations.sql)'}. Re-auth with /api/linkedin/auth?scope=ads once LinkedIn Marketing API is approved.`
    // Only try to update the tracking columns if the schema supports them
    if ('linkedin_last_sync_at' in (settings ?? {})) {
      await sb.from('app_settings').update({
        linkedin_last_sync_at: new Date().toISOString(),
        linkedin_last_sync_error: err,
      }).eq('id', 1)
    }
    return { synced: 0, skipped: 0, error: err, updated_campaign_ids: [] }
  }

  let query = sb.from('linkedin_campaigns').select('id, linkedin_campaign_id, account_id')
  if (accountId) query = query.eq('account_id', accountId)
  const { data: campaigns } = await query

  const withRealIds = (campaigns ?? []).filter(c => c.linkedin_campaign_id && /^\d+$/.test(c.linkedin_campaign_id))
  if (withRealIds.length === 0) {
    return { synced: 0, skipped: 0, updated_campaign_ids: [] }
  }

  // Dynamic date window: look back 30 days. The LinkedIn adAnalyticsV2 endpoint
  // returns one row per campaign+day; we aggregate client-side.
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

  const ids = withRealIds.map(c => c.linkedin_campaign_id).join(',')
  const params = new URLSearchParams({
    q: 'analytics',
    pivot: 'CAMPAIGN',
    timeGranularity: 'ALL',
    'dateRange.start.year': String(start.getUTCFullYear()),
    'dateRange.start.month': String(start.getUTCMonth() + 1),
    'dateRange.start.day': String(start.getUTCDate()),
    'dateRange.end.year': String(end.getUTCFullYear()),
    'dateRange.end.month': String(end.getUTCMonth() + 1),
    'dateRange.end.day': String(end.getUTCDate()),
    fields: 'impressions,clicks,costInLocalCurrency,externalWebsiteConversions,pivotValues',
    campaigns: ids,
  })

  const analyticsUrl = `https://api.linkedin.com/v2/adAnalyticsV2?${params.toString()}`

  let res: Response
  try {
    res = await fetch(analyticsUrl, {
      headers: {
        Authorization: `Bearer ${settings.linkedin_access_token}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr)
    await sb.from('app_settings').update({
      linkedin_last_sync_at: new Date().toISOString(),
      linkedin_last_sync_error: `Network error: ${msg}`,
    }).eq('id', 1)
    return { synced: 0, skipped: withRealIds.length, error: msg, updated_campaign_ids: [] }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = `LinkedIn ${res.status}: ${body.slice(0, 300)}`
    await sb.from('app_settings').update({
      linkedin_last_sync_at: new Date().toISOString(),
      linkedin_last_sync_error: err,
    }).eq('id', 1)
    return { synced: 0, skipped: withRealIds.length, error: err, updated_campaign_ids: [] }
  }

  const payload = await res.json().catch(() => ({ elements: [] })) as { elements?: AnalyticsElement[] }
  const elements = payload.elements ?? []
  const updatedIds: string[] = []

  for (const el of elements) {
    const urn = el.pivotValues?.[0] ?? ''
    // urn:li:sponsoredCampaign:690308904 → 690308904
    const match = urn.match(/(\d+)(?!.*\d)/)
    const linkedinCampaignId = match?.[1]
    if (!linkedinCampaignId) continue

    const row = withRealIds.find(c => c.linkedin_campaign_id === linkedinCampaignId)
    if (!row) continue

    // Zero-overwrite guard. If LinkedIn returns an element with ALL metric fields
    // missing/undefined, skip the update — do not overwrite real stored values with
    // zeros. This protects Bayer's live $44 spend row from being blanked during a
    // partial-response sync (e.g. LinkedIn mid-roll of demographics, server glitch).
    const hasAnyMetric =
      el.impressions !== undefined ||
      el.clicks !== undefined ||
      el.costInLocalCurrency !== undefined ||
      el.externalWebsiteConversions !== undefined
    if (!hasAnyMetric) continue

    // Partial-update pattern: only write the fields LinkedIn actually sent. Missing
    // fields leave the stored value alone (Supabase update ignores undefined keys).
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (el.impressions !== undefined) update.impressions = Number(el.impressions) || 0
    if (el.clicks !== undefined) update.clicks = Number(el.clicks) || 0
    if (el.externalWebsiteConversions !== undefined) update.leads = Number(el.externalWebsiteConversions) || 0
    if (el.costInLocalCurrency !== undefined) update.cost_usd = Number(el.costInLocalCurrency) || 0

    const { error } = await sb
      .from('linkedin_campaigns')
      .update(update)
      .eq('id', row.id)

    if (!error) updatedIds.push(row.id)
  }

  await sb.from('app_settings').update({
    linkedin_last_sync_at: new Date().toISOString(),
    linkedin_last_sync_error: null,
  }).eq('id', 1)

  return {
    synced: updatedIds.length,
    skipped: withRealIds.length - updatedIds.length,
    updated_campaign_ids: updatedIds,
  }
}
