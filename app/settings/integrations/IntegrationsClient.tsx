'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface LinkedInStatus { connected: boolean; identity: string | null; ads_scope_ok: boolean }
interface SalesforceStatus { connected: boolean; identity: string | null; instance_url: string | null; last_sync_error: string | null }
interface ZoomInfoStatus { connected: boolean; username: string | null; last_sync_error: string | null }

export default function IntegrationsClient() {
  const [linkedin, setLinkedin] = useState<LinkedInStatus>({ connected: false, identity: null, ads_scope_ok: false })
  const [salesforce, setSalesforce] = useState<SalesforceStatus>({ connected: false, identity: null, instance_url: null, last_sync_error: null })
  const [zoominfo, setZoominfo] = useState<ZoomInfoStatus>({ connected: false, username: null, last_sync_error: null })
  const [zoominfoUsername, setZoominfoUsername] = useState('')
  const [zoominfoClientId, setZoominfoClientId] = useState('')
  const [zoominfoPrivateKey, setZoominfoPrivateKey] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const refreshStatuses = useCallback(() => {
    Promise.all([
      fetch('/api/linkedin/campaigns').then(r => r.json()).catch(() => ({})),
      fetch('/api/integrations/salesforce/status').then(r => r.json()).catch(() => ({})),
      fetch('/api/integrations/zoominfo/status').then(r => r.json()).catch(() => ({})),
    ]).then(([li, sf, zi]) => {
      setLinkedin({
        connected: !!li.connected,
        identity: li.identity ?? null,
        ads_scope_ok: !!li.ads_scope_ok,
      })
      setSalesforce({
        connected: !!sf.connected,
        identity: sf.identity ?? null,
        instance_url: sf.instance_url ?? null,
        last_sync_error: sf.last_sync_error ?? null,
      })
      setZoominfo({
        connected: !!zi.connected,
        username: zi.username ?? null,
        last_sync_error: zi.last_sync_error ?? null,
      })
    })
  }, [])

  useEffect(() => {
    refreshStatuses()
    // React to query-string callbacks
    const params = new URLSearchParams(window.location.search)
    if (params.get('salesforce') === 'connected') setMessage({ kind: 'ok', text: 'Salesforce connected.' })
    if (params.get('salesforce') === 'missing_credentials') setMessage({ kind: 'err', text: 'Set SALESFORCE_CLIENT_ID + SALESFORCE_CLIENT_SECRET in .env.local, then try again.' })
    if (params.get('salesforce') === 'token_error') setMessage({ kind: 'err', text: 'Salesforce token exchange failed. Check your Connected App setup.' })
  }, [refreshStatuses])

  const connectZoomInfo = async () => {
    setSaving('zoominfo')
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/zoominfo/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: zoominfoUsername.trim(),
          client_id: zoominfoClientId.trim(),
          private_key: zoominfoPrivateKey,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ kind: 'err', text: data.error ?? `Connect failed (${res.status})` })
      } else {
        setMessage({ kind: 'ok', text: `ZoomInfo connected as ${data.identity ?? zoominfoUsername}.` })
        setZoominfoUsername('')
        setZoominfoClientId('')
        setZoominfoPrivateKey('')
        refreshStatuses()
      }
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link href="/mission-control" className="text-xs text-gray-500 hover:text-gray-700">← Back to Mission Control</Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: '#00263E' }}>Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Connect Tulip ABX to your revenue stack. Zero fabricated data — every contact comes from a connected system or real public source.</p>
      </div>

      {message && (
        <div
          className="mb-4 px-4 py-2 rounded text-sm"
          style={{
            backgroundColor: message.kind === 'ok' ? '#dcfce7' : '#fee2e2',
            color: message.kind === 'ok' ? '#166534' : '#991b1b',
            border: `1px solid ${message.kind === 'ok' ? '#86efac' : '#fca5a5'}`,
          }}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LinkedIn */}
        <IntegrationCard
          name="LinkedIn"
          logo="in"
          logoColor="#0077b5"
          description="OAuth sign-in + Campaign Manager draft/publish flow. adAnalyticsV2 real-time metrics sync activates once ABX is onboarded under Tulip's LinkedIn Marketing Developer Platform credentials — enterprise prerequisite for any production deployment."
          connected={linkedin.connected}
          identity={linkedin.identity}
          badge={linkedin.connected ? (linkedin.ads_scope_ok ? 'Live metrics' : 'Ready to activate') : null}
          connectAction={
            !linkedin.connected ? (
              <a href="/api/linkedin/auth" className="font-bold text-sm px-4 py-2 rounded inline-block" style={{ backgroundColor: '#0077b5', color: 'white' }}>Connect LinkedIn</a>
            ) : !linkedin.ads_scope_ok ? (
              <a href="/api/linkedin/auth?scope=ads" className="font-bold text-sm px-4 py-2 rounded inline-block" style={{ backgroundColor: '#00263E', color: '#F2EEA1' }}>Preview ads-scope re-auth</a>
            ) : null
          }
          enables={[
            'OAuth sign-in with LinkedIn (OpenID Connect)',
            'Campaign Manager draft + publish flow, campaign ID auto-link',
            'Live adAnalyticsV2 sync (impressions / clicks / spend / CTR / CPC / CPM / CPL every 60s)',
            'Classic SaaS B2B KPI panel with benchmark banding (green / amber / red)',
            'CSV import for instant metrics loading when live sync is in standby',
          ]}
        />

        {/* Salesforce */}
        <IntegrationCard
          name="Salesforce"
          logo="sf"
          logoColor="#00a1e0"
          description="OAuth 2.0 Web Server flow → pulls Accounts + Opportunities via SOQL. Links ABX accounts to SF Account records, syncs pipeline stage and amount per account."
          connected={salesforce.connected}
          identity={salesforce.identity}
          badge={salesforce.instance_url ? new URL(salesforce.instance_url).hostname : null}
          connectAction={
            !salesforce.connected ? (
              <a href="/api/integrations/salesforce/auth" className="font-bold text-sm px-4 py-2 rounded inline-block" style={{ backgroundColor: '#00a1e0', color: 'white' }}>Connect Salesforce</a>
            ) : null
          }
          errorMessage={salesforce.last_sync_error}
          enables={[
            'OAuth 2.0 Web Server flow (SALESFORCE_CLIENT_ID/SECRET in .env.local)',
            'Match ABX accounts to SF Account records by name',
            'Pull open opportunities + pipeline stage per account',
            'Auto-refresh access tokens when expired',
          ]}
        />

        {/* ZoomInfo */}
        <IntegrationCard
          name="ZoomInfo"
          logo="zi"
          logoColor="#e67e00"
          description="JWT auth (RS256) → company enrichment + intent signals. Enriches accounts with firmographics and pulls intent topics as signals into Mission Control."
          connected={zoominfo.connected}
          identity={zoominfo.username}
          badge={null}
          connectAction={
            !zoominfo.connected ? (
              <div className="space-y-2">
                <input
                  value={zoominfoUsername}
                  onChange={e => setZoominfoUsername(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border rounded font-mono"
                  placeholder="Username"
                />
                <input
                  value={zoominfoClientId}
                  onChange={e => setZoominfoClientId(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border rounded font-mono"
                  placeholder="Client ID"
                />
                <textarea
                  value={zoominfoPrivateKey}
                  onChange={e => setZoominfoPrivateKey(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border rounded font-mono"
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  rows={4}
                />
                <button
                  onClick={connectZoomInfo}
                  disabled={!zoominfoUsername || !zoominfoClientId || !zoominfoPrivateKey || saving === 'zoominfo'}
                  className="w-full font-bold text-sm px-3 py-1.5 rounded"
                  style={{ backgroundColor: '#e67e00', color: 'white', opacity: (!zoominfoUsername || !zoominfoClientId || !zoominfoPrivateKey) ? 0.5 : 1 }}
                >
                  {saving === 'zoominfo' ? 'Validating...' : 'Validate + connect'}
                </button>
              </div>
            ) : null
          }
          errorMessage={zoominfo.last_sync_error}
          enables={[
            'Firmographic enrichment (employees, revenue, industry, HQ)',
            'Intent signal ingestion → writes to signals table as intent rows',
            'Account → ZoomInfo company ID linkage on first enrich call',
            'Fuzzy company matching by name',
          ]}
        />
      </div>

      <div className="mt-6 text-xs text-gray-500 max-w-3xl flex items-center gap-2">
        <span>ⓘ</span>
        <span>Salesforce + ZoomInfo backends activate upon Tulip credential onboarding.</span>
      </div>
    </div>
  )
}

function IntegrationCard({
  name, logo, logoColor, description, connected, identity, connectAction, enables, badge, errorMessage,
}: {
  name: string
  logo: string
  logoColor: string
  description: string
  connected: boolean
  identity: string | null
  badge?: string | null
  connectAction: React.ReactNode
  enables: string[]
  errorMessage?: string | null
}) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: logoColor }}>
            {logo}
          </div>
          <div>
            <div className="font-semibold" style={{ color: '#00263E' }}>{name}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: connected ? '#22c55e' : '#d1d5db' }} />
              <span className="text-xs font-medium" style={{ color: connected ? '#15803d' : '#6b7280' }}>
                {connected ? (identity ? `Connected as ${identity}` : 'Connected') : 'Not connected'}
              </span>
              {badge && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>{badge}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed mb-3">{description}</p>
      {errorMessage && (
        <div className="mb-3 px-2 py-1.5 rounded text-xs" style={{ backgroundColor: '#fef3c7', color: '#78350f', border: '1px solid #fbbf24' }}>
          Last error: {errorMessage}
        </div>
      )}
      {connectAction && <div className="mb-3">{connectAction}</div>}
      <div className="pt-3 border-t">
        <div className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1.5">When connected, enables:</div>
        <ul className="space-y-1">
          {enables.map((e, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
