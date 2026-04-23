'use client'

import { useState } from 'react'
import { X, Users } from 'lucide-react'
import { STAKEHOLDER_ROLE_PRESETS } from '@/lib/database.types'

export interface PlayActivationPayload {
  name: string
  role: string
  customNote: string
}

interface Props {
  play: {
    id: string
    name: string
    description: string
    owner_team: string
    play_type: string
    sample_outreach_opener: string
  }
  onClose: () => void
  onSubmit: (payload: PlayActivationPayload) => Promise<void>
}

// Prompts name + role (with free-text "Other…" option) before activating a play.
// Activation = creating an account_action row with play context attached, so the
// play shows up in the Actions tab immediately and stays linked to the clicker.
export default function PlayActivationModal({ play, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [rolePreset, setRolePreset] = useState<string>('')
  const [customRole, setCustomRole] = useState('')
  const [customNote, setCustomNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveRole = rolePreset === 'Other' ? customRole.trim() : rolePreset.trim()
  const canSubmit = name.trim() && effectiveRole

  const handleSubmit = async () => {
    if (!canSubmit) { setError('Fill name and role before activating.'); return }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), role: effectiveRole, customNote: customNote.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed')
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white', borderRadius: 12, padding: 24,
          maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#00263E' }}>Activate this play</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Committing to this play adds it to the Actions tab and marks it as owned by you. The team sees it immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Play preview — what you're committing to */}
        <div
          className="rounded-lg p-4 mb-4"
          style={{ backgroundColor: '#F8F8F6', border: '1px solid var(--tulip-border)' }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 mb-1">
            Play
          </div>
          <div className="text-sm font-semibold mb-1" style={{ color: '#00263E' }}>{play.name}</div>
          <div className="text-xs text-gray-600 leading-relaxed mb-2">{play.description}</div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-white border text-gray-600">
              {play.play_type.replace('_', ' ')}
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">Owned by {play.owner_team.toUpperCase()}</span>
          </div>
        </div>

        {/* Name + role — always required */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Your name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Asaf Bar Natan"
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]"
              style={{ borderColor: 'var(--tulip-border)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Your role <span className="text-red-500">*</span>
            </label>
            <select
              value={rolePreset}
              onChange={e => {
                setRolePreset(e.target.value)
                if (e.target.value !== 'Other') setCustomRole('')
              }}
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] bg-white"
              style={{ borderColor: 'var(--tulip-border)' }}
            >
              <option value="">Select role…</option>
              {STAKEHOLDER_ROLE_PRESETS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="Other">Other… (type it in)</option>
            </select>
          </div>
        </div>

        {rolePreset === 'Other' && (
          <div className="mb-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Custom role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customRole}
              onChange={e => setCustomRole(e.target.value)}
              placeholder="e.g. VP Revenue Operations, Solutions Engineer"
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]"
              style={{ borderColor: 'var(--tulip-border)' }}
              autoFocus
            />
          </div>
        )}

        {/* Optional extra context */}
        <div className="mb-5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Your note <span className="text-gray-400 font-normal normal-case text-[10px]">(optional — what you plan to do differently)</span>
          </label>
          <textarea
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            rows={3}
            placeholder="e.g. Adjusting the opener to reference Hiroaki's METI DX Stock mention from last week"
            className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] resize-vertical"
            style={{ borderColor: 'var(--tulip-border)' }}
          />
        </div>

        {/* Alignment reminder */}
        <div
          className="flex items-start gap-3 rounded-lg p-3 mb-4 text-xs"
          style={{ backgroundColor: '#E8F5F9', border: '1px solid #B6DCE1', color: '#0c4a6e' }}
        >
          <Users size={14} className="mt-0.5 shrink-0" />
          <span>
            The activated play appears in the Actions tab attributed to you. This keeps the team aligned on who committed to what.
          </span>
        </div>

        {error && (
          <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-sm px-4 py-2 rounded-md border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--tulip-border)', color: 'var(--tulip-gray)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="text-sm font-semibold px-4 py-2 rounded-md transition-colors"
            style={{
              backgroundColor: canSubmit ? '#00263E' : '#94a3b8',
              color: 'white',
              cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Activating…' : 'Activate play'}
          </button>
        </div>
      </div>
    </div>
  )
}
