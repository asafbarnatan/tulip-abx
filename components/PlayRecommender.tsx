'use client'

import type { Account, CustomPlay } from '@/lib/database.types'
import { getRecommendedPlays } from '@/lib/play-library'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Users, FileText, Zap, Copy, Check, CheckCircle, Play as PlayIcon, Plus, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import PlayActivationModal, { type PlayActivationPayload } from './PlayActivationModal'
import CustomPlayEditor from './CustomPlayEditor'

// Renderable play — discriminates library vs custom at the UI level.
// Library plays have trigger_conditions; custom plays have created_by fields.
// We only care about the display shape, so the discriminator on __isCustom
// is enough to branch the Edit/Delete affordances on custom rows.
type RenderablePlay = {
  id: string
  name: string
  description: string
  play_type: 'outbound' | 'inbound' | 'event' | 'exec' | 'demo' | 'cs_expansion' | 'content'
  owner_team: 'marketing' | 'sales' | 'sdr' | 'cs'
  duration_days: number
  assets: string[]
  sample_outreach_opener: string
  expected_outcome: string
  __isCustom: boolean
  __customRow?: CustomPlay  // present only when __isCustom = true
}

const PLAY_TYPE_CONFIG: Record<string, { color: string; icon: React.ReactNode; actionType: string }> = {
  demo:         { color: 'bg-blue-50 text-blue-700 border-blue-200',       icon: <Zap className="w-3.5 h-3.5" />,       actionType: 'demo' },
  event:        { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Calendar className="w-3.5 h-3.5" />,  actionType: 'event' },
  outbound:     { color: 'bg-amber-50 text-amber-700 border-amber-200',    icon: <Users className="w-3.5 h-3.5" />,     actionType: 'email' },
  inbound:      { color: 'bg-green-50 text-green-700 border-green-200',    icon: <FileText className="w-3.5 h-3.5" />,  actionType: 'content_send' },
  exec:         { color: 'bg-navy-50 text-slate-700 border-slate-200',     icon: <Users className="w-3.5 h-3.5" />,     actionType: 'meeting' },
  cs_expansion: { color: 'bg-teal-50 text-teal-700 border-teal-200',       icon: <Zap className="w-3.5 h-3.5" />,       actionType: 'meeting' },
  content:      { color: 'bg-gray-50 text-gray-700 border-gray-200',       icon: <FileText className="w-3.5 h-3.5" />,  actionType: 'content_send' },
}

const TEAM_COLORS: Record<string, string> = {
  marketing: 'bg-purple-100 text-purple-700',
  sales:     'bg-blue-100 text-blue-700',
  sdr:       'bg-amber-100 text-amber-700',
  cs:        'bg-green-100 text-green-700',
}

// Map owner_team (from play library) to a team value allowed by the
// account_actions.team CHECK constraint (marketing|sales|cs|sdr).
function teamForPlay(ownerTeam: string): string {
  if (ownerTeam === 'marketing' || ownerTeam === 'sales' || ownerTeam === 'sdr' || ownerTeam === 'cs') return ownerTeam
  return 'sales'
}

function CopyOpenerButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
      style={{ borderColor: '#008CB9', color: '#008CB9' }}
    >
      {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy opener</>}
    </button>
  )
}

export default function PlayRecommender({ account }: { account: Account }) {
  const libraryPlays = getRecommendedPlays({
    lifecycle_stage: account.lifecycle_stage,
    industry_vertical: account.industry_vertical,
    geography: account.geography,
    digital_maturity: account.digital_maturity,
    tier: account.tier,
  })

  // Custom plays fetched from /api/custom-plays. Sorted newest-first by the
  // API; we render them above library plays so the AE's explicit choices
  // dominate the scan order.
  const [customPlays, setCustomPlays] = useState<CustomPlay[]>([])

  // Activation state — map play_id → action_id so deactivation can DELETE the
  // corresponding action row. Fetched on mount from account_actions notes JSON.
  const [activationMap, setActivationMap] = useState<Record<string, string>>({})
  const [activationModalPlay, setActivationModalPlay] = useState<RenderablePlay | null>(null)
  const [deactivatingPlayId, setDeactivatingPlayId] = useState<string | null>(null)
  const [confirmingDeactivatePlayId, setConfirmingDeactivatePlayId] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState<string | null>(null)

  // Custom-play CRUD state — addModal true = create; editing = edit.
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingCustomPlay, setEditingCustomPlay] = useState<CustomPlay | null>(null)
  const [confirmingDeleteCustomId, setConfirmingDeleteCustomId] = useState<string | null>(null)
  const [deletingCustomId, setDeletingCustomId] = useState<string | null>(null)

  // Fetch custom plays on mount / account change.
  useEffect(() => {
    fetch(`/api/custom-plays?accountId=${account.id}`)
      .then(r => r.json())
      .then(d => setCustomPlays((d.plays ?? []) as CustomPlay[]))
      .catch(() => { /* non-fatal — table may not exist pre-migration */ })
  }, [account.id])

  // Merge into one render list. Custom plays first (AE intentional > filtered
  // library defaults). Both types go through the same card renderer below.
  const plays: RenderablePlay[] = [
    ...customPlays.map(cp => ({
      id: cp.id,
      name: cp.name,
      description: cp.description,
      play_type: cp.play_type,
      owner_team: cp.owner_team,
      duration_days: cp.duration_days,
      assets: cp.assets,
      sample_outreach_opener: cp.sample_outreach_opener,
      expected_outcome: cp.expected_outcome,
      __isCustom: true,
      __customRow: cp,
    } as RenderablePlay)),
    ...libraryPlays.map(lp => ({
      id: lp.id,
      name: lp.name,
      description: lp.description,
      play_type: lp.play_type,
      owner_team: lp.owner_team,
      duration_days: lp.duration_days,
      assets: lp.assets,
      sample_outreach_opener: lp.sample_outreach_opener,
      expected_outcome: lp.expected_outcome,
      __isCustom: false,
    } as RenderablePlay)),
  ]

  // On mount, fetch existing actions and build the play_id → action_id map.
  // Handles the case where the same play was activated multiple times — keeps
  // the most recent one (actions are ordered desc by created_at).
  useEffect(() => {
    fetch(`/api/actions?accountId=${account.id}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {}
        for (const a of (d.actions ?? []) as Array<{ id: string; notes: string | null }>) {
          const notes = a.notes ?? ''
          try {
            const parsed = JSON.parse(notes)
            if (parsed?.play_id && typeof parsed.play_id === 'string' && !map[parsed.play_id]) {
              map[parsed.play_id] = a.id
            }
          } catch {
            // Non-JSON notes — ignore.
          }
        }
        setActivationMap(map)
      })
      .catch(() => { /* non-fatal */ })
  }, [account.id])

  const handleActivate = async (play: RenderablePlay, payload: PlayActivationPayload) => {
    const cfg = PLAY_TYPE_CONFIG[play.play_type] ?? PLAY_TYPE_CONFIG.content
    const notes = JSON.stringify({
      play_id: play.id,
      play_name: play.name,
      opener: play.sample_outreach_opener,
      activated_by: payload.name,
      activated_role: payload.role,
      activator_note: payload.customNote || null,
      activated_at: new Date().toISOString(),
    })
    const res = await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: account.id,
        action_type: cfg.actionType,
        performed_by: payload.name,
        team: teamForPlay(play.owner_team),
        contact_name: null,
        outcome: 'play_activated',
        notes,
        assigned_name: payload.name,
        assigned_role: payload.role,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? 'Activation failed')
    }
    const saved = await res.json()
    setActivationMap(prev => ({ ...prev, [play.id]: saved.action.id }))
    setActivationModalPlay(null)
    setSavedToast(`"${play.name}" activated by ${payload.name} (${payload.role}). See it in the Actions tab.`)
    setTimeout(() => setSavedToast(null), 5000)
  }

  // Deactivate = delete the linked account_actions row. Two-stage confirm so
  // a misclick doesn't destroy someone else's commitment without warning.
  const handleDeactivate = async (play: RenderablePlay) => {
    const actionId = activationMap[play.id]
    if (!actionId) return
    setDeactivatingPlayId(play.id)
    try {
      const res = await fetch(`/api/actions/${actionId}`, { method: 'DELETE' })
      if (res.ok) {
        setActivationMap(prev => {
          const next = { ...prev }
          delete next[play.id]
          return next
        })
        setSavedToast(`"${play.name}" deactivated. The action has been removed from the Actions tab.`)
        setTimeout(() => setSavedToast(null), 5000)
      }
    } finally {
      setDeactivatingPlayId(null)
      setConfirmingDeactivatePlayId(null)
    }
  }

  // Delete a custom play permanently. The API also deletes any linked
  // account_actions rows (activations of this play), so the UI removes the
  // corresponding activationMap entry too.
  const handleDeleteCustom = async (customPlayId: string) => {
    setDeletingCustomId(customPlayId)
    try {
      const res = await fetch(`/api/custom-plays/${customPlayId}`, { method: 'DELETE' })
      if (res.ok) {
        setCustomPlays(prev => prev.filter(p => p.id !== customPlayId))
        setActivationMap(prev => {
          const next = { ...prev }
          delete next[customPlayId]
          return next
        })
        setSavedToast('Custom play removed. Any linked activation has been pulled from the Actions tab.')
        setTimeout(() => setSavedToast(null), 5000)
      }
    } finally {
      setDeletingCustomId(null)
      setConfirmingDeleteCustomId(null)
    }
  }

  // "Duplicate to custom" — takes a library play and POSTs a copy to
  // /api/custom-plays for THIS account, then opens the editor on the new row
  // so the user can tweak the copy. Library plays stay global/read-only.
  const handleDuplicateAsCustom = async (play: RenderablePlay) => {
    const body = {
      account_id: account.id,
      name: play.name,
      description: play.description,
      play_type: play.play_type,
      owner_team: play.owner_team,
      duration_days: play.duration_days,
      sample_outreach_opener: play.sample_outreach_opener,
      expected_outcome: play.expected_outcome,
      assets: play.assets,
      created_by_name: 'Duplicated from library',
      created_by_role: null,
    }
    const res = await fetch('/api/custom-plays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      setSavedToast(data.error ?? 'Could not duplicate play.')
      setTimeout(() => setSavedToast(null), 4000)
      return
    }
    setCustomPlays(prev => [data.play, ...prev])
    setEditingCustomPlay(data.play)  // open edit modal immediately on the new copy
  }

  // Upsert handler for both create and edit paths coming out of CustomPlayEditor.
  const handleCustomSaved = (saved: CustomPlay) => {
    setCustomPlays(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      if (idx === -1) return [saved, ...prev]
      const next = [...prev]
      next[idx] = saved
      return next
    })
    setSavedToast(editingCustomPlay ? `"${saved.name}" updated.` : `"${saved.name}" added to ${account.name}.`)
    setTimeout(() => setSavedToast(null), 5000)
  }

  const addButton = (
    <button
      type="button"
      onClick={() => setAddModalOpen(true)}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0"
      style={{ backgroundColor: '#00263E', color: '#F2EEA1' }}
    >
      <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Add custom play
    </button>
  )

  if (plays.length === 0) {
    return (
      <>
        <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
          <p className="font-medium">No plays match this account&apos;s current profile.</p>
          <p className="text-sm mt-1">Add a custom play for this account, or update the account&apos;s lifecycle stage / maturity to unlock relevant templates.</p>
          <div className="mt-4 flex justify-center">{addButton}</div>
        </div>
        {addModalOpen && (
          <CustomPlayEditor
            accountId={account.id}
            accountName={account.name}
            onClose={() => setAddModalOpen(false)}
            onSaved={handleCustomSaved}
          />
        )}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4 flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-600 flex-1 min-w-0">
          <span className="font-semibold" style={{ color: '#00263E' }}>
            {plays.length} {plays.length === 1 ? 'play' : 'plays'}
          </span>{' '}
          for {account.name}
          {customPlays.length > 0 && (
            <> — <span style={{ color: '#00263E', fontWeight: 600 }}>{customPlays.length} custom</span>, {libraryPlays.length} from the library</>
          )}
          {customPlays.length === 0 && (
            <> based on lifecycle stage ({account.lifecycle_stage}), vertical ({account.industry_vertical}), geography ({account.geography}), and digital maturity ({account.digital_maturity}/5)</>
          )}.
          {' '}Click <strong>Activate this play</strong> on any card to commit — it appears in the Actions tab immediately, attributed to you.
        </p>
        {addButton}
      </div>

      {savedToast && (
        <div
          className="rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm"
          style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534' }}
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{savedToast}</span>
        </div>
      )}

      {plays.map((play, i) => {
        const typeConfig = PLAY_TYPE_CONFIG[play.play_type] ?? PLAY_TYPE_CONFIG.content
        const activated = !!activationMap[play.id]
        const confirmingDeactivate = confirmingDeactivatePlayId === play.id
        const deactivating = deactivatingPlayId === play.id
        return (
          <Card
            key={play.id}
            className="border shadow-sm transition-all"
            style={activated ? { borderColor: '#22c55e', backgroundColor: '#F0FDF4' } : undefined}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: activated ? '#22c55e' : '#00263E' }}>
                    {activated ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{play.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
                        {typeConfig.icon}
                        {play.play_type.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TEAM_COLORS[play.owner_team]}`}>
                        {play.owner_team.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">{play.duration_days}-day play</span>
                      {play.__isCustom && (
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tulip-celery)', color: 'var(--tulip-navy)' }}>
                          Custom
                        </span>
                      )}
                      {activated && (
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: '#22c55e', color: 'white' }}>
                          Activated
                        </span>
                      )}
                    </div>
                    {play.__isCustom && play.__customRow?.created_by_name && (
                      <div className="text-[11px] text-gray-500 mt-1">
                        Added by {play.__customRow.created_by_name}
                        {play.__customRow.created_by_role ? ` · ${play.__customRow.created_by_role}` : ''}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {play.__isCustom && play.__customRow && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingCustomPlay(play.__customRow!)}
                        title="Edit this custom play"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                        style={{ borderColor: '#d0dbe6', color: '#64748b' }}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      {confirmingDeleteCustomId === play.id ? (
                        <div className="flex items-center gap-1 bg-white border rounded-lg p-1" style={{ borderColor: '#fca5a5' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustom(play.id)}
                            disabled={deletingCustomId === play.id}
                            className="text-[11px] font-bold px-2 py-1 rounded"
                            style={{ backgroundColor: '#dc2626', color: 'white' }}
                            title="Permanently deletes this custom play and any linked Activations"
                          >
                            {deletingCustomId === play.id ? 'Deleting…' : 'Confirm delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteCustomId(null)}
                            className="text-[11px] text-gray-500 px-2 py-1 rounded hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteCustomId(play.id)}
                          title="Delete this custom play"
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                          style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </>
                  )}
                  {!play.__isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDuplicateAsCustom(play)}
                      title="Copy this library play into a custom play you can edit for this account"
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                      style={{ borderColor: '#d0dbe6', color: '#64748b' }}
                    >
                      <Pencil className="w-3 h-3" /> Duplicate to custom
                    </button>
                  )}
                  <CopyOpenerButton text={play.sample_outreach_opener} />
                  {activated ? (
                    confirmingDeactivate ? (
                      <div className="flex items-center gap-1 bg-white border rounded-lg p-1" style={{ borderColor: '#fca5a5' }}>
                        <button
                          type="button"
                          onClick={() => handleDeactivate(play)}
                          disabled={deactivating}
                          className="text-[11px] font-bold px-2 py-1 rounded"
                          style={{ backgroundColor: '#dc2626', color: 'white' }}
                        >
                          {deactivating ? 'Removing…' : 'Confirm deactivate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeactivatePlayId(null)}
                          className="text-[11px] text-gray-500 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingDeactivatePlayId(play.id)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors group/deactivate"
                        style={{ backgroundColor: '#22c55e', color: 'white' }}
                        title="Click to deactivate — removes the linked action from the Actions tab"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="group-hover/deactivate:hidden">Activated</span>
                        <span className="hidden group-hover/deactivate:inline">Click to deactivate</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => setActivationModalPlay(play)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                      style={{ backgroundColor: '#00263E', color: '#F2EEA1' }}
                    >
                      <PlayIcon className="w-3.5 h-3.5" fill="currentColor" /> Activate this play
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-4">{play.description}</p>

              {/* Outreach opener */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                <div className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Sample outreach opener</div>
                <p className="text-sm text-gray-700 leading-relaxed italic">&ldquo;{play.sample_outreach_opener}&rdquo;</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Assets</div>
                  <ul className="space-y-0.5">
                    {play.assets.map((asset, j) => (
                      <li key={j} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                        {asset}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Expected outcome</div>
                  <p className="text-xs text-gray-600 leading-relaxed">{play.expected_outcome}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {activationModalPlay && (
        <PlayActivationModal
          play={activationModalPlay}
          onClose={() => setActivationModalPlay(null)}
          onSubmit={payload => handleActivate(activationModalPlay, payload)}
        />
      )}

      {addModalOpen && (
        <CustomPlayEditor
          accountId={account.id}
          accountName={account.name}
          onClose={() => setAddModalOpen(false)}
          onSaved={handleCustomSaved}
        />
      )}

      {editingCustomPlay && (
        <CustomPlayEditor
          accountId={account.id}
          accountName={account.name}
          initial={editingCustomPlay}
          onClose={() => setEditingCustomPlay(null)}
          onSaved={handleCustomSaved}
        />
      )}
    </div>
  )
}
