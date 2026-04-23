'use client'

import type { Account } from '@/lib/database.types'
import { getRecommendedPlays } from '@/lib/play-library'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Users, FileText, Zap, Copy, Check, CheckCircle, Play as PlayIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import PlayActivationModal, { type PlayActivationPayload } from './PlayActivationModal'

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
  const plays = getRecommendedPlays({
    lifecycle_stage: account.lifecycle_stage,
    industry_vertical: account.industry_vertical,
    geography: account.geography,
    digital_maturity: account.digital_maturity,
    tier: account.tier,
  })

  // Activation state — map play_id → action_id so deactivation can DELETE the
  // corresponding action row. Fetched on mount from account_actions notes JSON.
  const [activationMap, setActivationMap] = useState<Record<string, string>>({})
  const [activationModalPlay, setActivationModalPlay] = useState<(typeof plays)[number] | null>(null)
  const [deactivatingPlayId, setDeactivatingPlayId] = useState<string | null>(null)
  const [confirmingDeactivatePlayId, setConfirmingDeactivatePlayId] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState<string | null>(null)

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

  const handleActivate = async (play: (typeof plays)[number], payload: PlayActivationPayload) => {
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
  const handleDeactivate = async (play: (typeof plays)[number]) => {
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

  if (plays.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
        <p className="font-medium">No plays match this account&apos;s current profile.</p>
        <p className="text-sm mt-1">Update the account&apos;s lifecycle stage or maturity level to unlock relevant plays.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <p className="text-sm text-gray-600">
          <span className="font-semibold" style={{ color: '#00263E' }}>
            {plays.length} plays recommended
          </span>{' '}
          for {account.name} based on lifecycle stage ({account.lifecycle_stage}), vertical ({account.industry_vertical}),
          geography ({account.geography}), and digital maturity ({account.digital_maturity}/5).
          {' '}Click <strong>Activate this play</strong> on any card to commit — it appears in the Actions tab immediately, attributed to you.
        </p>
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
                      {activated && (
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: '#22c55e', color: 'white' }}>
                          Activated
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
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
    </div>
  )
}
