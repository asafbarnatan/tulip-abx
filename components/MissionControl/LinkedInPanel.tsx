'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2, RefreshCw, Play, Pencil, ArrowUpRight, Pin, GripVertical } from 'lucide-react'
import {
  computeCampaignKpis,
  benchmarkCtr,
  benchmarkCpc,
  benchmarkCpl,
  benchmarkClickToLead,
  formatUsd,
  formatPct,
  type BenchmarkBand,
} from '@/lib/linkedin-kpis'

interface Campaign {
  id: string
  campaign_name: string
  headline?: string
  ad_copy?: string
  status: string
  impressions: number
  clicks: number
  leads: number
  cost_usd: number
  budget_usd?: number
  total_engagements?: number
  created_at: string
  accounts?: { name: string }
  linkedin_campaign_id?: string
  // ABM extras — editable via MetricsForm, render in CampaignKpiPanel
  audience_size?: number | null
  unique_companies?: number | null
  decision_maker_pct?: number | null
  target_account_count?: number | null
  // Pin-to-top — non-null when this campaign is pinned. Sort order in /api/linkedin/campaigns
  // puts non-null pinned_at above null, so the pinned card always renders first.
  pinned_at?: string | null
  // Manual drag order — lower index renders higher. Null rows fall below manually-ranked ones.
  display_order?: number | null
}

interface Props {
  initialConnected: boolean
  // Hard-scope to one account (used by the per-account Campaigns tab).
  // When set, the account filter UI is hidden and API calls always include ?accountId=.
  accountId?: string
}

interface AccountOption { id: string; name: string }

export function LinkedInPanel({ initialConnected, accountId }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [connected, setConnected] = useState(initialConnected)
  const [identity, setIdentity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [metricsEditingId, setMetricsEditingId] = useState<string | null>(null)
  const [detailsEditingId, setDetailsEditingId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [adsScopeOk, setAdsScopeOk] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [newCampaignOpen, setNewCampaignOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [filterAccountId, setFilterAccountId] = useState<string>(accountId ?? '')
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([])

  const effectiveAccountId = accountId ?? filterAccountId // scoped prop always wins

  const loadCampaigns = useCallback(() => {
    const qs = effectiveAccountId ? `?accountId=${effectiveAccountId}` : ''
    fetch(`/api/linkedin/campaigns${qs}`)
      .then(r => r.json())
      .then(d => {
        setCampaigns(d.campaigns ?? [])
        setConnected(d.connected)
        setIdentity(d.identity ?? null)
        setAdsScopeOk(!!d.ads_scope_ok)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [effectiveAccountId])

  const syncNow = useCallback(async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const qs = effectiveAccountId ? `?accountId=${effectiveAccountId}` : ''
      const res = await fetch(`/api/linkedin/campaigns/sync${qs}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncMessage(data.error ?? `Sync failed (${res.status})`)
      } else {
        setSyncMessage(`Synced ${data.synced} campaign${data.synced === 1 ? '' : 's'}${data.skipped ? `, skipped ${data.skipped}` : ''}.`)
        loadCampaigns()
      }
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Sync error')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMessage(null), 6000)
    }
  }, [effectiveAccountId, loadCampaigns])

  useEffect(() => { loadCampaigns() }, [loadCampaigns])

  // Populate account filter options — only needed when unscoped (Mission Control).
  useEffect(() => {
    if (accountId) return
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setAccountOptions((d.accounts ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }))))
      .catch(() => { /* non-fatal */ })
  }, [accountId])

  // Two-stage delete: first click arms confirmation (inline pill), second click commits.
  // Uses in-component state instead of window.confirm() because the latter is sometimes
  // blocked or silently suppressed depending on browser pop-up settings.
  const armDelete = (id: string) => {
    setConfirmDeleteId(id)
    // auto-unarm after 5s so it doesn't stay armed silently
    setTimeout(() => {
      setConfirmDeleteId(cur => (cur === id ? null : cur))
    }, 5000)
  }

  const commitDelete = async (id: string) => {
    setConfirmDeleteId(null)
    setDeletingId(id)
    try {
      const res = await fetch(`/api/linkedin/campaigns/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id))
      } else {
        const body = await res.text().catch(() => '')
        console.error('[LinkedInPanel] delete failed', res.status, body)
        setDeletingId(null)
      }
    } catch (err) {
      console.error('[LinkedInPanel] delete threw', err)
      setDeletingId(null)
    } finally {
      setDeletingId(cur => (cur === id ? null : cur))
    }
  }

  const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: '#fef9c3', color: '#854d0e', label: 'DRAFT — AI GENERATED' },
    active: { bg: '#dcfce7', color: '#166534', label: 'LIVE ON LINKEDIN' },
    paused: { bg: '#f1f5f9', color: '#475569', label: 'PAUSED' },
    completed: { bg: '#ede9fe', color: '#5b21b6', label: 'COMPLETED' },
    failed: { bg: '#fee2e2', color: '#991b1b', label: 'FAILED' },
  }

  const patchCampaign = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/linkedin/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) loadCampaigns()
    return res.ok
  }

  // Pin a campaign to the top of the panel. Server enforces single-pinned-at-a-time:
  // pinning any row clears every other row's pinned_at, so the UI reflects the
  // same invariant after loadCampaigns() refetches the sorted list.
  const togglePin = async (c: Campaign) => {
    await patchCampaign(c.id, { pinned: !c.pinned_at })
  }

  // Drag-reorder state. `draggingId` = the card currently being dragged. `dragOverId`
  // = the card the pointer is hovering over as a drop target (used for a thin blue
  // line indicator). Optimistic reorder: we splice the local array on drop and
  // POST /reorder in the background; the background refetch after PATCH reconciles.
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const persistOrder = async (ordered: Campaign[]) => {
    // Surface reorder failures explicitly — earlier version swallowed 500s, which
    // hid the "display_order column missing" case for a long time. If the POST
    // fails, roll the UI back by refetching the server's actual order so the user
    // sees reality instead of a phantom reordered state that won't survive refresh.
    try {
      const res = await fetch('/api/linkedin/campaigns/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ordered.map(c => c.id) }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('[LinkedInPanel] reorder failed:', res.status, body.error ?? body)
        // If the server couldn't save the order, rebase the UI on real data.
        loadCampaigns()
      }
    } catch (err) {
      console.error('[LinkedInPanel] reorder threw:', err)
      loadCampaigns()
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    // allowEffect=move lets the cursor show the move affordance; setData is
    // required for Firefox to fire drop events.
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (targetId !== dragOverId) setDragOverId(targetId)
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = draggingId ?? e.dataTransfer.getData('text/plain')
    setDraggingId(null)
    setDragOverId(null)
    if (!sourceId || sourceId === targetId) return

    const fromIdx = campaigns.findIndex(c => c.id === sourceId)
    const toIdx = campaigns.findIndex(c => c.id === targetId)
    if (fromIdx < 0 || toIdx < 0) return

    const next = campaigns.slice()
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setCampaigns(next)
    await persistOrder(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tulip-gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          LinkedIn Campaigns{accountId && campaigns.length > 0 ? ` · ${campaigns.length}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Account filter — only in Mission Control (unscoped) */}
          {!accountId && (
            <select
              value={filterAccountId}
              onChange={e => setFilterAccountId(e.target.value)}
              style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 4,
                border: '1px solid var(--tulip-border)', backgroundColor: 'white',
                color: '#0f172a', cursor: 'pointer', fontWeight: 600,
              }}
              title="Filter campaigns by account"
            >
              <option value="">All accounts</option>
              {accountOptions.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setNewCampaignOpen(true)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 4,
              border: 'none', cursor: 'pointer', fontWeight: 700,
              backgroundColor: '#00263E', color: '#F2EEA1',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="Create a new LinkedIn campaign draft"
          >
            + New campaign
          </button>
          <button
            onClick={syncNow}
            disabled={syncing || !connected}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 4,
              border: '1px solid var(--tulip-border)', backgroundColor: 'white',
              color: syncing ? '#94a3b8' : '#0f172a', cursor: syncing || !connected ? 'not-allowed' : 'pointer',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
              opacity: !connected ? 0.5 : 1,
            }}
            title={adsScopeOk
              ? 'Pull live impressions/clicks/spend from LinkedIn adAnalyticsV2'
              : 'Requires r_ads_reporting scope (LinkedIn Marketing API approval). Re-auth with the ads scope profile once approved.'}
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : undefined} />
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
          <button
            onClick={() => setCsvImportOpen(true)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 4,
              border: '1px solid var(--tulip-border)', backgroundColor: 'white',
              color: '#0f172a', cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="Paste LinkedIn Campaign Manager CSV to auto-update metrics"
          >
            📊 Import CSV
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: connected ? '#22c55e' : '#94a3b8' }} />
            <span style={{ color: connected ? '#22c55e' : 'var(--tulip-gray)', fontWeight: 600 }}>
              {connected ? (identity ? `Connected as ${identity}` : 'Connected') : 'Not connected'}
            </span>
          </div>
          {!connected && (
            <a
              href="/api/linkedin/auth"
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 4,
                backgroundColor: '#0077b5', color: 'white', textDecoration: 'none', fontWeight: 600
              }}
            >
              Connect
            </a>
          )}
        </div>
      </div>

      {/* Enterprise architecture banner — one line, understated */}
      {connected && !adsScopeOk && (
        <div style={{
          marginBottom: 10, padding: '6px 10px', borderRadius: 6,
          backgroundColor: '#f0f9ff', border: '1px solid #bae6fd',
          fontSize: 11, color: '#0c4a6e', lineHeight: 1.5,
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13 }}>ⓘ</span>
          <span>Live <code>adAnalyticsV2</code> sync activates under Tulip&apos;s LinkedIn Marketing API credentials.</span>
        </div>
      )}

      {syncMessage && (
        <div style={{
          marginBottom: 10, padding: '6px 10px', borderRadius: 6,
          backgroundColor: syncMessage.toLowerCase().includes('error') || syncMessage.toLowerCase().includes('failed') || syncMessage.toLowerCase().includes('missing') ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${syncMessage.toLowerCase().includes('error') || syncMessage.toLowerCase().includes('failed') || syncMessage.toLowerCase().includes('missing') ? '#f87171' : '#86efac'}`,
          fontSize: 11,
          color: syncMessage.toLowerCase().includes('error') || syncMessage.toLowerCase().includes('failed') || syncMessage.toLowerCase().includes('missing') ? '#991b1b' : '#166534',
        }}>
          {syncMessage}
        </div>
      )}

      {csvImportOpen && (
        <CsvImportModal
          onClose={() => setCsvImportOpen(false)}
          onSuccess={() => { loadCampaigns(); setCsvImportOpen(false) }}
        />
      )}

      {newCampaignOpen && (
        <NewCampaignModal
          scopedAccountId={accountId ?? null}
          accountOptions={accountOptions}
          onClose={() => setNewCampaignOpen(false)}
          onCreated={() => { loadCampaigns(); setNewCampaignOpen(false) }}
        />
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--tulip-gray)', fontSize: 13, paddingTop: 24 }}>Loading...</div>
        )}

        {!loading && campaigns.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--tulip-gray)', fontSize: 13, paddingTop: 24 }}>
            No campaigns yet. Run the LinkedIn Campaign agent to create one.
          </div>
        )}

        {campaigns.map(c => {
          const cfg = statusConfig[c.status] ?? statusConfig.draft
          const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00'
          const isExpanded = expanded === c.id
          const isPublishing = publishingId === c.id
          const isEditingMetrics = metricsEditingId === c.id
          const isEditingDetails = detailsEditingId === c.id
          const isLive = c.status === 'active' && c.linkedin_campaign_id && /^\d+$/.test(c.linkedin_campaign_id)
          // The LCM URL is independent of status — a completed campaign is still
          // viewable in Campaign Manager (history, ads, audience, demographics).
          // Gate only on having a real numeric campaign ID.
          const hasLinkedInId = c.linkedin_campaign_id && /^\d+$/.test(c.linkedin_campaign_id)
          const lcmUrl = hasLinkedInId ? `https://www.linkedin.com/campaignmanager/accounts/0/campaigns/${c.linkedin_campaign_id}` : null
          const isPinned = !!c.pinned_at

          // Border priority: live green > pinned celery > default. A LIVE campaign
          // keeps its green outline even when pinned — "this is running on LinkedIn
          // right now" is stronger information than "this is the spotlight". Pinned
          // status still reads loud-and-clear via the celery glow stacked on top of
          // the green shadow, plus the PINNED badge and filled pin icon.
          const cardBorder = isLive
            ? '2px solid #22c55e'
            : (isPinned ? '2px solid var(--tulip-celery)' : '1px solid var(--tulip-border)')
          const cardShadow = isPinned && isLive
            ? '0 0 0 3px rgba(242, 238, 161, 0.55), 0 2px 8px rgba(34, 197, 94, 0.15)'
            : isPinned
              ? '0 2px 12px rgba(242, 238, 161, 0.45)'
              : (isLive ? '0 2px 8px rgba(34, 197, 94, 0.15)' : 'none')

          const isDragging = draggingId === c.id
          const isDragOver = dragOverId === c.id && draggingId !== c.id

          return (
            <div
              key={c.id}
              draggable
              onDragStart={e => handleDragStart(e, c.id)}
              onDragEnd={handleDragEnd}
              onDragOver={e => handleDragOver(e, c.id)}
              onDrop={e => handleDrop(e, c.id)}
              style={{
                border: cardBorder,
                borderRadius: 8, marginBottom: 10, overflow: 'hidden',
                boxShadow: cardShadow,
                opacity: isDragging ? 0.45 : 1,
                // Drop indicator — a 3px blue top-border-like ring on the hover target.
                outline: isDragOver ? '3px solid var(--tulip-teal)' : undefined,
                outlineOffset: isDragOver ? '-1px' : undefined,
                transition: 'opacity 120ms ease, outline 80ms ease',
              }}
            >
              {/* Card header */}
              <div
                onClick={() => setExpanded(isExpanded ? null : c.id)}
                style={{ padding: '10px 12px', cursor: 'pointer', backgroundColor: 'white', position: 'relative' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                  {/* Drag handle — cursor:grab signals the whole card is draggable.
                      Native HTML5 drag still fires when the user grabs anywhere on the
                      card; the handle is just a visible affordance. */}
                  <span
                    aria-hidden="true"
                    title="Drag to reorder"
                    style={{
                      color: '#94a3b8', cursor: 'grab', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, lineHeight: 0,
                    }}
                    onMouseDown={e => { (e.currentTarget as HTMLSpanElement).style.cursor = 'grabbing' }}
                    onMouseUp={e => { (e.currentTarget as HTMLSpanElement).style.cursor = 'grab' }}
                  >
                    <GripVertical size={14} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.campaign_name}</span>
                  {/* Controls cluster — stopPropagation catch-all so buttons inside cannot leak to the card expand handler */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, backgroundColor: cfg.bg, color: cfg.color, letterSpacing: '0.05em' }}>
                      {cfg.label}
                    </span>
                    {isPinned && (
                      <span
                        style={{
                          fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 9999,
                          backgroundColor: 'var(--tulip-celery)', color: 'var(--tulip-navy)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        PINNED
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => togglePin(c)}
                      aria-label={isPinned ? `Unpin ${c.campaign_name}` : `Pin ${c.campaign_name} to top`}
                      title={isPinned ? 'Unpin from top' : 'Pin to top'}
                      style={{
                        background: isPinned ? 'var(--tulip-celery)' : 'transparent',
                        border: isPinned ? '1px solid var(--tulip-celery)' : '1px solid transparent',
                        cursor: 'pointer',
                        color: isPinned ? 'var(--tulip-navy)' : '#64748b',
                        padding: '8px', lineHeight: 0, borderRadius: 4,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        if (!isPinned) {
                          el.style.color = 'var(--tulip-navy)'
                          el.style.backgroundColor = 'var(--tulip-celery)'
                        }
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        if (!isPinned) {
                          el.style.color = '#64748b'
                          el.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      <Pin
                        size={14}
                        fill={isPinned ? 'var(--tulip-navy)' : 'none'}
                        strokeWidth={isPinned ? 2.5 : 2}
                      />
                    </button>
                    {confirmDeleteId === c.id ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => commitDelete(c.id)}
                          disabled={deletingId === c.id}
                          style={{
                            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 4,
                            border: 'none', cursor: 'pointer', backgroundColor: '#dc2626', color: 'white',
                            opacity: deletingId === c.id ? 0.6 : 1,
                          }}
                        >
                          {deletingId === c.id ? 'Deleting…' : 'Confirm delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          style={{
                            fontSize: 11, padding: '4px 8px', borderRadius: 4,
                            border: '1px solid var(--tulip-border)', cursor: 'pointer',
                            backgroundColor: 'white', color: 'var(--tulip-gray)',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => armDelete(c.id)}
                        disabled={deletingId === c.id}
                        aria-label={`Delete ${c.campaign_name}`}
                        title="Delete campaign from Tulip ABX"
                        style={{
                          background: 'transparent', border: '1px solid transparent', cursor: 'pointer',
                          color: '#64748b', padding: '8px', lineHeight: 0, borderRadius: 4,
                          opacity: deletingId === c.id ? 0.4 : 1,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLButtonElement
                          el.style.color = '#dc2626'
                          el.style.backgroundColor = '#fee2e2'
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLButtonElement
                          el.style.color = '#64748b'
                          el.style.backgroundColor = 'transparent'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {c.accounts?.name && <div style={{ fontSize: 11, color: 'var(--tulip-gray)', marginBottom: 6 }}>{c.accounts.name}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                  {[
                    { label: 'Impressions', value: c.impressions.toLocaleString() },
                    { label: 'Clicks', value: c.clicks.toLocaleString() },
                    { label: 'CTR', value: `${ctr}%` },
                    { label: 'Cost', value: `$${c.cost_usd.toFixed(0)}` },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 4, padding: '6px 0' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--tulip-gray)', marginTop: 1 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid var(--tulip-border)', padding: '12px' }}>
                  {isEditingDetails ? (
                    <EditDetailsForm
                      campaign={c}
                      onCancel={() => setDetailsEditingId(null)}
                      onSubmit={async (payload) => {
                        const ok = await patchCampaign(c.id, payload)
                        if (ok) setDetailsEditingId(null)
                      }}
                    />
                  ) : (
                    <>
                  {c.headline && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 700, marginBottom: 3, letterSpacing: '0.05em' }}>HEADLINE</div>
                      <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{c.headline}</div>
                    </div>
                  )}
                  {c.ad_copy && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 700, marginBottom: 3, letterSpacing: '0.05em' }}>AD COPY</div>
                      <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{c.ad_copy}</div>
                    </div>
                  )}

                  {/* Classic SaaS B2B marketing KPIs — shown whenever the campaign has run
                      in LinkedIn (active, paused, or completed). Drafts and failed runs hide it
                      because there are no real numbers to render. */}
                  {(c.status === 'active' || c.status === 'paused' || c.status === 'completed') && c.linkedin_campaign_id && (
                    <CampaignKpiPanel campaign={c} />
                  )}

                  {/* DRAFT → publish flow */}
                  {c.status === 'draft' && !isPublishing && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--tulip-border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--tulip-gray)', marginBottom: 8, lineHeight: 1.5 }}>
                        <strong style={{ color: '#0f172a' }}>Next step:</strong> Review this draft, then publish to LinkedIn Campaign Manager. Paste the campaign URL back here to sync it to Mission Control.
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setPublishingId(c.id)}
                          style={{
                            fontSize: 12, fontWeight: 700, padding: '7px 14px',
                            borderRadius: 6, border: 'none', cursor: 'pointer',
                            backgroundColor: '#0077b5', color: 'white',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <Play size={12} fill="currentColor" strokeWidth={2.5} /> Publish to LinkedIn
                        </button>
                        <a
                          href="https://www.linkedin.com/campaignmanager/"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 12, padding: '7px 14px', borderRadius: 6,
                            backgroundColor: 'white', color: '#0077b5',
                            textDecoration: 'none', fontWeight: 600,
                            border: '1px solid #0077b5',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                          }}
                        >
                          Open Campaign Manager <ArrowUpRight size={12} />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Publish flow — paste URL */}
                  {isPublishing && (
                    <PublishForm
                      onCancel={() => setPublishingId(null)}
                      onSubmit={async (payload) => {
                        const ok = await patchCampaign(c.id, { ...payload, status: 'active' })
                        if (ok) setPublishingId(null)
                      }}
                    />
                  )}

                  {/* LIVE / paused / completed campaign — metrics refresh + LCM link */}
                  {(c.status === 'active' || c.status === 'paused' || c.status === 'completed') && !isEditingMetrics && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--tulip-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        {lcmUrl && (
                          <a href={lcmUrl} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: '#0077b5', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            View in Campaign Manager <ArrowUpRight size={11} />
                          </a>
                        )}
                        <button
                          onClick={() => setMetricsEditingId(c.id)}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: '4px 10px',
                            borderRadius: 4, border: '1px solid var(--tulip-border)', cursor: 'pointer',
                            backgroundColor: 'white', color: '#0f172a',
                          }}
                        >
                          Update metrics
                        </button>
                      </div>
                      {c.linkedin_campaign_id && (
                        <div style={{ fontSize: 10, color: 'var(--tulip-gray)' }}>
                          LinkedIn campaign ID: <code style={{ backgroundColor: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>{c.linkedin_campaign_id}</code>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metrics editing form */}
                  {isEditingMetrics && (
                    <MetricsForm
                      campaign={c}
                      onCancel={() => setMetricsEditingId(null)}
                      onSubmit={async (payload) => {
                        const ok = await patchCampaign(c.id, payload)
                        if (ok) setMetricsEditingId(null)
                      }}
                    />
                  )}

                  {/* Edit details button — name/headline/ad_copy/campaign ID */}
                  {!isEditingMetrics && !isPublishing && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--tulip-border)' }}>
                      <button
                        onClick={() => setDetailsEditingId(c.id)}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 4,
                          border: '1px solid var(--tulip-border)', cursor: 'pointer',
                          backgroundColor: 'white', color: '#0f172a',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        <Pencil size={11} /> Edit details
                      </button>
                    </div>
                  )}

                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 10 }}>
                    Created {new Date(c.created_at).toLocaleString()}
                  </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Inline publish form
// ────────────────────────────────────────────────────────────────────────────

interface PublishFormProps {
  onCancel: () => void
  onSubmit: (payload: { linkedin_campaign_id: string; budget_usd?: number }) => Promise<void>
}

function PublishForm({ onCancel, onSubmit }: PublishFormProps) {
  const [url, setUrl] = useState('')
  const [budget, setBudget] = useState('50')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!url.trim()) return
    setSubmitting(true)
    await onSubmit({ linkedin_campaign_id: url, budget_usd: Number(budget) || undefined })
    setSubmitting(false)
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--tulip-border)' }}>
      <div style={{ fontSize: 11, color: 'var(--tulip-gray)', marginBottom: 8, lineHeight: 1.5 }}>
        Paste the LinkedIn Campaign Manager URL (or numeric campaign ID) from the campaign you just created.
      </div>
      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://www.linkedin.com/campaignmanager/accounts/.../campaigns/987654321"
        style={{
          width: '100%', fontSize: 12, padding: '8px 10px', borderRadius: 6,
          border: '1px solid var(--tulip-border)', marginBottom: 8, fontFamily: 'monospace',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: 'var(--tulip-gray)' }}>Budget $</label>
        <input
          type="number"
          value={budget}
          onChange={e => setBudget(e.target.value)}
          style={{
            width: 80, fontSize: 12, padding: '6px 8px', borderRadius: 4,
            border: '1px solid var(--tulip-border)', outline: 'none',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleSubmit}
          disabled={!url.trim() || submitting}
          style={{
            fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 6,
            border: 'none', cursor: submitting || !url.trim() ? 'not-allowed' : 'pointer',
            backgroundColor: !url.trim() ? '#94a3b8' : '#22c55e', color: 'white',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Publishing...' : '✓ Mark as Published'}
        </button>
        <button
          onClick={onCancel}
          style={{
            fontSize: 12, padding: '7px 14px', borderRadius: 6,
            border: '1px solid var(--tulip-border)', cursor: 'pointer',
            backgroundColor: 'white', color: 'var(--tulip-gray)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Metrics update form
// ────────────────────────────────────────────────────────────────────────────

interface MetricsFormProps {
  campaign: Campaign
  onCancel: () => void
  onSubmit: (payload: {
    impressions: number
    clicks: number
    leads: number
    total_engagements: number
    cost_usd: number
    budget_usd?: number | null
    audience_size?: number | null
    unique_companies?: number | null
    decision_maker_pct?: number | null
  }) => Promise<void>
}

function MetricsForm({ campaign, onCancel, onSubmit }: MetricsFormProps) {
  const [impressions, setImpressions] = useState(String(campaign.impressions))
  const [clicks, setClicks] = useState(String(campaign.clicks))
  const [leads, setLeads] = useState(String(campaign.leads))
  const [engagements, setEngagements] = useState(String(campaign.total_engagements ?? 0))
  const [cost, setCost] = useState(String(campaign.cost_usd))
  const [budget, setBudget] = useState(campaign.budget_usd != null ? String(campaign.budget_usd) : '')
  const [audienceSize, setAudienceSize] = useState(campaign.audience_size != null ? String(campaign.audience_size) : '')
  const [uniqueCompanies, setUniqueCompanies] = useState(campaign.unique_companies != null ? String(campaign.unique_companies) : '')
  const [decisionMakerPct, setDecisionMakerPct] = useState(campaign.decision_maker_pct != null ? String(campaign.decision_maker_pct) : '')
  const [submitting, setSubmitting] = useState(false)

  const parseOptionalNumber = (v: string): number | null => {
    if (v === '' || v == null) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    await onSubmit({
      impressions: Number(impressions) || 0,
      clicks: Number(clicks) || 0,
      leads: Number(leads) || 0,
      total_engagements: Math.max(0, Number(engagements) || 0),
      cost_usd: Number(cost) || 0,
      budget_usd: parseOptionalNumber(budget),
      audience_size: parseOptionalNumber(audienceSize),
      unique_companies: parseOptionalNumber(uniqueCompanies),
      decision_maker_pct: parseOptionalNumber(decisionMakerPct),
    })
    setSubmitting(false)
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--tulip-border)' }}>
      <div style={{ fontSize: 11, color: 'var(--tulip-gray)', marginBottom: 10, lineHeight: 1.5 }}>
        Copy numbers from LinkedIn Campaign Manager → Analytics, Demographics, and Audience tabs.
      </div>

      {/* Core paid-media metrics */}
      <div style={{ fontSize: 9, color: 'var(--tulip-gray)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>CORE METRICS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Impressions', value: impressions, setter: setImpressions, hint: 'Total ad views' },
          { label: 'Clicks', value: clicks, setter: setClicks, hint: 'Landing page clicks' },
          { label: 'Engagements', value: engagements, setter: setEngagements, hint: 'Reactions + comments + shares + follows' },
          { label: 'Leads', value: leads, setter: setLeads, hint: 'Conversions via Insight Tag' },
          { label: 'Cost ($)', value: cost, setter: setCost, hint: 'Actual spend to date' },
        ].map(f => (
          <div key={f.label}>
            <label style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 600, display: 'block', marginBottom: 2 }}>{f.label}</label>
            <input
              type="number"
              value={f.value}
              onChange={e => f.setter(e.target.value)}
              placeholder={f.hint}
              style={{
                width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 4,
                border: '1px solid var(--tulip-border)', outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Budget + ABM-specific */}
      <div style={{ fontSize: 9, color: 'var(--tulip-gray)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>BUDGET + ABM COVERAGE</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Total budget ($)</label>
          <input
            type="number"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            placeholder="e.g. 44"
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--tulip-border)', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Audience size</label>
          <input
            type="number"
            value={audienceSize}
            onChange={e => setAudienceSize(e.target.value)}
            placeholder="e.g. 440 (forecast)"
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--tulip-border)', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Unique companies reached</label>
          <input
            type="number"
            value={uniqueCompanies}
            onChange={e => setUniqueCompanies(e.target.value)}
            placeholder="1 for pure ABM"
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--tulip-border)', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Decision-maker % (VP+)</label>
          <input
            type="number"
            value={decisionMakerPct}
            onChange={e => setDecisionMakerPct(e.target.value)}
            placeholder="e.g. 62"
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--tulip-border)', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 6,
            border: 'none', cursor: 'pointer', backgroundColor: '#0077b5', color: 'white',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Saving...' : 'Save all metrics'}
        </button>
        <button
          onClick={onCancel}
          style={{
            fontSize: 12, padding: '6px 12px', borderRadius: 6,
            border: '1px solid var(--tulip-border)', cursor: 'pointer',
            backgroundColor: 'white', color: 'var(--tulip-gray)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Edit details form — campaign name, headline, ad copy, LinkedIn campaign ID
// ────────────────────────────────────────────────────────────────────────────

interface EditDetailsFormProps {
  campaign: Campaign
  onCancel: () => void
  onSubmit: (payload: {
    campaign_name?: string
    headline?: string
    ad_copy?: string
    linkedin_campaign_id?: string
  }) => Promise<void>
}

function EditDetailsForm({ campaign, onCancel, onSubmit }: EditDetailsFormProps) {
  const [name, setName] = useState(campaign.campaign_name ?? '')
  const [headline, setHeadline] = useState(campaign.headline ?? '')
  const [adCopy, setAdCopy] = useState(campaign.ad_copy ?? '')
  const [linkedinId, setLinkedinId] = useState(campaign.linkedin_campaign_id ?? '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    await onSubmit({
      campaign_name: name.trim(),
      headline: headline.trim(),
      ad_copy: adCopy.trim(),
      linkedin_campaign_id: linkedinId.trim(),
    })
    setSubmitting(false)
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--tulip-gray)', marginBottom: 10, lineHeight: 1.5 }}>
        Edit the campaign&apos;s public-facing details. Pasting a Campaign Manager URL into the LinkedIn campaign ID field will auto-extract the numeric ID.
      </div>

      <label style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 700, display: 'block', marginBottom: 3, letterSpacing: '0.05em' }}>CAMPAIGN NAME</label>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{
          width: '100%', fontSize: 12, padding: '7px 9px', borderRadius: 4,
          border: '1px solid var(--tulip-border)', outline: 'none', marginBottom: 10,
        }}
      />

      <label style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 700, display: 'block', marginBottom: 3, letterSpacing: '0.05em' }}>HEADLINE</label>
      <textarea
        value={headline}
        onChange={e => setHeadline(e.target.value)}
        rows={3}
        maxLength={300}
        style={{
          width: '100%', fontSize: 12, padding: '7px 9px', borderRadius: 4,
          border: '1px solid var(--tulip-border)', outline: 'none', marginBottom: 10,
          fontFamily: 'inherit', resize: 'vertical',
        }}
      />

      <label style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 700, display: 'block', marginBottom: 3, letterSpacing: '0.05em' }}>AD COPY</label>
      <textarea
        value={adCopy}
        onChange={e => setAdCopy(e.target.value)}
        rows={6}
        maxLength={2000}
        style={{
          width: '100%', fontSize: 12, padding: '7px 9px', borderRadius: 4,
          border: '1px solid var(--tulip-border)', outline: 'none', marginBottom: 10,
          fontFamily: 'inherit', resize: 'vertical',
        }}
      />

      <label style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 700, display: 'block', marginBottom: 3, letterSpacing: '0.05em' }}>LINKEDIN CAMPAIGN ID OR URL</label>
      <input
        type="text"
        value={linkedinId}
        onChange={e => setLinkedinId(e.target.value)}
        placeholder="690308904 or https://www.linkedin.com/campaignmanager/accounts/.../campaigns/690308904"
        style={{
          width: '100%', fontSize: 12, padding: '7px 9px', borderRadius: 4,
          border: '1px solid var(--tulip-border)', outline: 'none', marginBottom: 12,
          fontFamily: 'monospace',
        }}
      />

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 6,
            border: 'none', cursor: 'pointer', backgroundColor: '#0077b5', color: 'white',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
        <button
          onClick={onCancel}
          style={{
            fontSize: 12, padding: '7px 14px', borderRadius: 6,
            border: '1px solid var(--tulip-border)', cursor: 'pointer',
            backgroundColor: 'white', color: 'var(--tulip-gray)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// New Campaign Modal — creates a draft campaign row manually
// ────────────────────────────────────────────────────────────────────────────

interface NewCampaignModalProps {
  scopedAccountId: string | null
  accountOptions: AccountOption[]
  onClose: () => void
  onCreated: () => void
}

function NewCampaignModal({ scopedAccountId, accountOptions, onClose, onCreated }: NewCampaignModalProps) {
  // When the panel is scoped to one account (the account-detail Campaigns tab),
  // scopedAccountId is set and we don't show the account picker.
  // Otherwise (Mission Control) we populate from accountOptions — but if those are
  // empty for some reason, we fetch them here as a fallback.
  const [options, setOptions] = useState<AccountOption[]>(accountOptions)
  useEffect(() => {
    if (scopedAccountId) return
    if (accountOptions.length > 0) { setOptions(accountOptions); return }
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setOptions((d.accounts ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }))))
      .catch(() => { /* non-fatal */ })
  }, [scopedAccountId, accountOptions])

  const [accountId, setAccountId] = useState(scopedAccountId ?? '')
  const [campaignName, setCampaignName] = useState('')
  const [headline, setHeadline] = useState('')
  const [adCopy, setAdCopy] = useState('')
  const [objective, setObjective] = useState('WEBSITE_VISITS')
  const [targets, setTargets] = useState('')
  const [budget, setBudget] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-name when we know the account
  useEffect(() => {
    if (!campaignName && accountId) {
      const acct = scopedAccountId
        ? accountOptions.find(a => a.id === scopedAccountId) ?? options.find(a => a.id === scopedAccountId)
        : options.find(a => a.id === accountId)
      if (acct) {
        const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
        setCampaignName(`TulipABX — ${acct.name} — ${month}`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, options])

  const handleSubmit = async () => {
    setError(null)
    if (!accountId) { setError('Select an account.'); return }
    if (!campaignName.trim()) { setError('Campaign name is required.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/linkedin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          campaign_name: campaignName.trim(),
          headline: headline.trim() || null,
          ad_copy: adCopy.trim() || null,
          objective,
          target_companies: targets.split(',').map(t => t.trim()).filter(Boolean),
          budget_usd: budget.trim() ? Number(budget) : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? `Create failed (${res.status})`)
        setSubmitting(false)
        return
      }
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white', borderRadius: 10, padding: 24,
          maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#00263E', margin: 0 }}>New LinkedIn campaign</h2>
            <p style={{ fontSize: 12, color: 'var(--tulip-gray)', marginTop: 4, margin: '4px 0 0', lineHeight: 1.5 }}>
              Creates a <strong>draft</strong> in Tulip ABX. Publish it to LinkedIn Campaign Manager later using the card&apos;s Publish flow.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ fontSize: 20, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tulip-gray)', lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!scopedAccountId && (
            <div>
              <label style={labelStyle}>Account *</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select an account…</option>
                {options.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Campaign name *</label>
            <input
              type="text"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder="TulipABX — Bayer AG — May 2026"
              style={inputStyle}
              maxLength={200}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Objective</label>
              <select value={objective} onChange={e => setObjective(e.target.value)} style={inputStyle}>
                <option value="WEBSITE_VISITS">Website visits</option>
                <option value="LEAD_GENERATION">Lead generation</option>
                <option value="BRAND_AWARENESS">Brand awareness</option>
                <option value="ENGAGEMENT">Engagement</option>
                <option value="VIDEO_VIEWS">Video views</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Budget ($)</label>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="e.g. 500"
                style={inputStyle}
                min={0}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Headline</label>
            <input
              type="text"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="One-line hook shown above the ad"
              style={inputStyle}
              maxLength={300}
            />
            <div style={{ fontSize: 10, color: 'var(--tulip-gray)', marginTop: 2 }}>{headline.length} / 300</div>
          </div>

          <div>
            <label style={labelStyle}>Ad copy</label>
            <textarea
              value={adCopy}
              onChange={e => setAdCopy(e.target.value)}
              placeholder="Body of the ad — 2-3 sentences that speak to the buying group's pain."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              maxLength={2000}
            />
            <div style={{ fontSize: 10, color: 'var(--tulip-gray)', marginTop: 2 }}>{adCopy.length} / 2000</div>
          </div>

          <div>
            <label style={labelStyle}>Target companies (comma-separated, optional)</label>
            <input
              type="text"
              value={targets}
              onChange={e => setTargets(e.target.value)}
              placeholder="bayer.com, sanofi.com, novartis.com"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                fontSize: 13, padding: '8px 16px', borderRadius: 6,
                border: '1px solid var(--tulip-border)', backgroundColor: 'white',
                cursor: 'pointer', color: 'var(--tulip-gray)', fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !accountId || !campaignName.trim()}
              style={{
                fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 6,
                border: 'none', cursor: (submitting || !accountId || !campaignName.trim()) ? 'not-allowed' : 'pointer',
                backgroundColor: (!accountId || !campaignName.trim()) ? '#94a3b8' : '#00263E', color: '#F2EEA1',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Creating…' : 'Create draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--tulip-gray)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 6,
  border: '1px solid var(--tulip-border)', outline: 'none', backgroundColor: 'white',
  color: '#0f172a',
}

// ────────────────────────────────────────────────────────────────────────────
// CSV Import Modal — paste the LinkedIn Campaign Manager CSV export here
// ────────────────────────────────────────────────────────────────────────────

interface CsvImportModalProps {
  onClose: () => void
  onSuccess: () => void
}

interface ImportResult {
  matched_count: number
  not_found_count: number
  errors_count: number
  matched: Array<{ linkedin_campaign_id: string; campaign_name: string; impressions: number; clicks: number; cost_usd: number; leads: number; total_engagements?: number }>
  not_found: string[]
  errors: string[]
  columns_detected: { campaign_id: string | null; ad_set_id?: string | null; impressions: string | null; clicks: string | null; spend: string | null; leads: string | null; engagements?: string | null }
}

function CsvImportModal({ onClose, onSuccess }: CsvImportModalProps) {
  const [csv, setCsv] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!csv.trim()) return
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/linkedin/campaigns/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Import failed')
      } else {
        setResult(data as ImportResult)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white', borderRadius: 10, padding: 24,
          maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#00263E', margin: 0 }}>Import from Campaign Manager CSV</h2>
            <p style={{ fontSize: 12, color: 'var(--tulip-gray)', marginTop: 4, margin: '4px 0 0', lineHeight: 1.5 }}>
              Paste the CSV exported from LinkedIn Campaign Manager → Analytics → Export. Metrics will auto-update across all matching campaigns.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              fontSize: 20, padding: 0, background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--tulip-gray)', lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Instructions */}
        <div style={{ fontSize: 11, color: 'var(--tulip-gray)', marginBottom: 10, lineHeight: 1.5, padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid var(--tulip-border)' }}>
          <strong style={{ color: '#0f172a' }}>How to export from LinkedIn:</strong>
          <ol style={{ margin: '4px 0 0 18px', padding: 0 }}>
            <li>Go to <a href="https://www.linkedin.com/campaignmanager/" target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5' }}>linkedin.com/campaignmanager</a></li>
            <li>Select your ad account → click <strong>Campaigns</strong> or <strong>Analytics</strong> tab</li>
            <li>Click <strong>Export</strong> (top right) → choose <strong>Performance CSV</strong></li>
            <li>Open the downloaded file, select all, copy, paste below</li>
          </ol>
        </div>

        {!result && (
          <>
            <textarea
              value={csv}
              onChange={e => setCsv(e.target.value)}
              placeholder="Campaign Name,Campaign ID,Impressions,Clicks,Total Spent (USD)...&#10;TulipABX — Bayer AG — May 2026,987654321,1247,18,14.50..."
              style={{
                width: '100%', height: 220, fontSize: 11, padding: 10,
                border: '1px solid var(--tulip-border)', borderRadius: 6,
                fontFamily: 'monospace', outline: 'none', resize: 'vertical',
                marginBottom: 10,
              }}
            />
            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '8px 10px', borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  fontSize: 13, padding: '8px 16px', borderRadius: 6,
                  border: '1px solid var(--tulip-border)', backgroundColor: 'white',
                  cursor: 'pointer', color: 'var(--tulip-gray)', fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!csv.trim() || submitting}
                style={{
                  fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 6,
                  border: 'none', cursor: submitting || !csv.trim() ? 'not-allowed' : 'pointer',
                  backgroundColor: !csv.trim() ? '#94a3b8' : '#00263E', color: 'var(--tulip-celery)',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Importing...' : 'Import metrics'}
              </button>
            </div>
          </>
        )}

        {result && (
          <div>
            <div style={{ padding: '12px 14px', borderRadius: 8, backgroundColor: result.matched_count > 0 ? '#dcfce7' : '#fef3c7', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: result.matched_count > 0 ? '#166534' : '#854d0e' }}>
                ✓ {result.matched_count} campaign{result.matched_count !== 1 ? 's' : ''} updated
              </div>
              {result.not_found_count > 0 && (
                <div style={{ fontSize: 12, color: '#854d0e', marginTop: 4 }}>
                  {result.not_found_count} CSV row{result.not_found_count !== 1 ? 's' : ''} didn&apos;t match a campaign in this app (campaigns not yet marked as published here)
                </div>
              )}
              {result.errors_count > 0 && (
                <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>
                  {result.errors_count} error{result.errors_count !== 1 ? 's' : ''} — see list below
                </div>
              )}
            </div>

            {result.matched.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tulip-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Updated campaigns</div>
                <div style={{ border: '1px solid var(--tulip-border)', borderRadius: 6, overflow: 'hidden' }}>
                  {result.matched.map((m, i) => (
                    <div key={m.linkedin_campaign_id} style={{ padding: '8px 12px', fontSize: 12, borderTop: i > 0 ? '1px solid var(--tulip-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{m.campaign_name}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>LinkedIn ID: {m.linkedin_campaign_id}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', textAlign: 'right' }}>
                        {m.impressions.toLocaleString()} imp · {m.clicks} clk{m.total_engagements != null && m.total_engagements > 0 ? ` · ${m.total_engagements} eng` : ''} · ${m.cost_usd.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.not_found.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tulip-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Unmatched campaign IDs</div>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: 4 }}>
                  {result.not_found.join(', ')}
                </div>
                <div style={{ fontSize: 10, color: 'var(--tulip-gray)', marginTop: 4 }}>
                  These LinkedIn campaigns aren&apos;t linked to drafts here. Go to the campaign card, click <strong>Publish to LinkedIn</strong>, and paste the LinkedIn Campaign Manager URL to link them.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                onClick={() => { setResult(null); setCsv('') }}
                style={{
                  fontSize: 12, padding: '6px 12px', borderRadius: 6,
                  border: '1px solid var(--tulip-border)', backgroundColor: 'white',
                  cursor: 'pointer', color: 'var(--tulip-gray)', fontWeight: 600,
                }}
              >
                Import another
              </button>
              <button
                onClick={onSuccess}
                style={{
                  fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 6,
                  border: 'none', cursor: 'pointer', backgroundColor: '#22c55e', color: 'white',
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Campaign KPI Panel — classic SaaS B2B marketing metrics for LinkedIn ABM
// ────────────────────────────────────────────────────────────────────────────

function CampaignKpiPanel({ campaign }: { campaign: Campaign }) {
  const k = computeCampaignKpis({
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    leads: campaign.leads,
    cost_usd: campaign.cost_usd,
    budget_usd: campaign.budget_usd,
    status: campaign.status,
    created_at: campaign.created_at,
    audience_size: campaign.audience_size,
    unique_companies: campaign.unique_companies,
    decision_maker_pct: campaign.decision_maker_pct,
  }, campaign.target_account_count ?? 1)

  const bandColor = (band: BenchmarkBand): { bg: string; fg: string } => {
    switch (band) {
      case 'green': return { bg: '#dcfce7', fg: '#166534' }
      case 'amber': return { bg: '#fef3c7', fg: '#92400e' }
      case 'red':   return { bg: '#fee2e2', fg: '#991b1b' }
      default:      return { bg: '#f1f5f9', fg: '#64748b' }
    }
  }

  // Compute a benchmark-aware one-line verdict: the story of how this campaign
  // is performing vs. LinkedIn B2B industry standards. Leads if we have enough
  // signal, otherwise falls back to "early data" language. For completed
  // campaigns we shift tense to past — "ran below benchmark" not "running".
  const verdict = buildCampaignVerdict(k, campaign.impressions > 0, campaign.status === 'completed')

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--tulip-border)' }}>
      <div style={{ fontSize: 10, color: 'var(--tulip-gray)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>
        SAAS B2B MARKETING KPIs · LinkedIn Sponsored Content · ABM
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontSize: 13, color: '#00263E', fontWeight: 700, lineHeight: 1.35 }}>
          {verdict}
        </div>
        <div style={{ fontSize: 10, color: 'var(--tulip-gray)' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: '#dcfce7', marginRight: 3, verticalAlign: 'middle' }} />
          top-quartile
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: '#fef3c7', marginLeft: 8, marginRight: 3, verticalAlign: 'middle' }} />
          median
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: '#fee2e2', marginLeft: 8, marginRight: 3, verticalAlign: 'middle' }} />
          below
        </div>
      </div>

      {/* Row 1: Budget pacing */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>BUDGET PACING</span>
          <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {formatUsd(k.spend, 2)} / {formatUsd(campaign.budget_usd ?? 0, 2)}
            {k.budgetBurnPct != null && <span style={{ color: '#64748b', fontWeight: 500 }}> · {k.budgetBurnPct.toFixed(0)}%</span>}
          </span>
        </div>
        <div style={{ height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${k.budgetBurnPct ?? 0}%`,
            height: '100%',
            backgroundColor: (k.budgetBurnPct ?? 0) >= 90 ? '#dc2626' : (k.budgetBurnPct ?? 0) >= 60 ? '#f59e0b' : '#22c55e',
          }} />
        </div>
        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>
          {campaign.status === 'completed' ? `Closed — ran ${k.daysLive} days` : `Day ${k.daysLive} of campaign`}
        </div>
      </div>

      {/* Row 2: Efficiency trio — CTR / CPC / CPM */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
        <KpiTile
          label="CTR"
          value={formatPct(k.ctr)}
          band={bandColor(benchmarkCtr(k.ctr))}
          help="Click-through rate. LinkedIn B2B median ~0.35%; top quartile ≥0.65%."
        />
        <KpiTile
          label="CPC"
          value={formatUsd(k.cpc)}
          band={bandColor(benchmarkCpc(k.cpc))}
          help="Cost per click. B2B LinkedIn range $5-12; pharma/finance sits at the upper end."
        />
        <KpiTile
          label="CPM"
          value={formatUsd(k.cpm)}
          band={bandColor('neutral')}
          help="Cost per 1000 impressions — useful for awareness-stage pacing."
        />
      </div>

      {/* Row 3: Funnel — Leads / CPL / Click-to-lead */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
        <KpiTile
          label="Leads"
          value={k.leads.toLocaleString()}
          band={bandColor('neutral')}
          help="Conversions tracked via LinkedIn Insight Tag or form-fill objective."
        />
        <KpiTile
          label="CPL"
          value={formatUsd(k.cpl)}
          band={bandColor(benchmarkCpl(k.cpl))}
          help="Cost per lead. Enterprise B2B target $50-150; high-ACV $150-300."
        />
        <KpiTile
          label="Click → Lead"
          value={formatPct(k.clickToLeadRate)}
          band={bandColor(benchmarkClickToLead(k.clickToLeadRate))}
          help="Share of clicks that converted. Healthy B2B rate ≥5%."
        />
      </div>

      {/* Row 4: ABM-specific */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <KpiTile
          label="Account reach"
          value={k.accountReachPct != null ? `${k.accountReachPct.toFixed(0)}%` : '—'}
          band={bandColor('neutral')}
          help="% of target accounts that received at least one impression. 100% = full ABM coverage."
        />
        <KpiTile
          label="Engagements"
          value={(campaign.total_engagements ?? 0).toLocaleString()}
          band={bandColor('neutral')}
          help="Reactions + comments + shares + follows + other clicks. LinkedIn's headline engagement metric on Sponsored Content."
        />
        <KpiTile
          label="Engagement rate"
          value={campaign.impressions > 0
            ? `${((Number(campaign.total_engagements ?? 0) / campaign.impressions) * 100).toFixed(2)}%`
            : '—'}
          band={bandColor(
            campaign.impressions > 0
              ? (() => {
                  const r = (Number(campaign.total_engagements ?? 0) / campaign.impressions) * 100
                  if (r >= 2) return 'green'
                  if (r >= 0.5) return 'amber'
                  return 'red'
                })()
              : 'neutral'
          )}
          help="Engagements ÷ impressions. B2B Sponsored Content median ~0.5-1%; top-quartile ≥2%."
        />
      </div>
    </div>
  )
}

// Turns a benchmark-banded KPI set into a plain-English verdict for the panel header.
// The point: open with the answer, then show the math — not the reverse.
function buildCampaignVerdict(k: ReturnType<typeof computeCampaignKpis>, hasData: boolean, isCompleted = false): string {
  if (!hasData) {
    return isCompleted
      ? 'Campaign closed — no measurable delivery on this run.'
      : 'Early campaign data — metrics populate as LinkedIn delivers impressions.'
  }

  const highlights: string[] = []
  const issues: string[] = []

  const ctrBand = benchmarkCtr(k.ctr)
  if (ctrBand === 'green') highlights.push(`above B2B median on CTR (${k.ctr.toFixed(2)}%)`)
  else if (ctrBand === 'red') issues.push('CTR below benchmark')

  const cpcBand = benchmarkCpc(k.cpc)
  if (cpcBand === 'green' && k.cpc != null) highlights.push(`efficient CPC ($${k.cpc.toFixed(2)})`)
  else if (cpcBand === 'red') issues.push('CPC elevated')

  const cplBand = benchmarkCpl(k.cpl)
  if (cplBand === 'green' && k.cpl != null) highlights.push(`enterprise-tier CPL ($${k.cpl.toFixed(0)})`)

  if (k.budgetBurnPct != null) {
    if (k.budgetBurnPct >= 90) issues.push(`${k.budgetBurnPct.toFixed(0)}% budget consumed`)
    else if (k.budgetBurnPct >= 60) highlights.push(`on-pace on budget (${k.budgetBurnPct.toFixed(0)}% burned)`)
    else highlights.push(`budget headroom (${k.budgetBurnPct.toFixed(0)}% burned)`)
  }

  if (highlights.length === 0 && issues.length === 0) {
    return isCompleted
      ? 'Campaign closed at plan — no outlier metrics.'
      : 'Campaign running to plan — no outlier metrics.'
  }

  const goodPart = highlights.slice(0, 2).join(', ')
  const badPart = issues.slice(0, 1).join(', ')

  if (goodPart && badPart) return `${capitalize(goodPart)}; ${badPart}.`
  if (goodPart) return `${capitalize(goodPart)}.`
  return `${capitalize(badPart)} — review targeting or creative.`
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function KpiTile({ label, value, band, help }: { label: string; value: string; band: { bg: string; fg: string }; help: string }) {
  const [hovered, setHovered] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Delayed close so the cursor can traverse the 6px gap between tile and
  // tooltip without losing hover state — same pattern as ScoreCircleWithTooltip.
  const openNow = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setHovered(true)
  }
  const closeSoon = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setHovered(false), 200)
  }

  return (
    <div
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={closeSoon}
      tabIndex={0}
      style={{
        position: 'relative',
        backgroundColor: band.bg, borderRadius: 6, padding: '8px 10px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 54,
        cursor: 'help', outline: 'none',
      }}
    >
      <div style={{ fontSize: 10.5, color: band.fg, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 16, color: band.fg, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{value}</div>

      {hovered && (
        <div
          role="tooltip"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
            width: 260, zIndex: 50,
            backgroundColor: '#00263E', color: 'white',
            borderRadius: 8, padding: '10px 12px',
            boxShadow: '0 10px 30px rgba(0, 38, 62, 0.3)',
            fontSize: 12, lineHeight: 1.5, fontWeight: 400,
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 10, color: '#F2EEA1', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ color: '#B6DCE1' }}>{help}</div>
        </div>
      )}
    </div>
  )
}
