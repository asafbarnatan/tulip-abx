'use client'

import { useState } from 'react'
import { X, Users } from 'lucide-react'
import type { InteractionStage } from '@/lib/database.types'
import { STAGES, STAGE_BY_KEY } from './stages'

// Role presets — users can also type a custom role via "Other..." → free text.
const ROLE_PRESETS = ['AE', 'CSM', 'Sales', 'Marketing', 'Ecosystem'] as const
const ACTION_TYPES = [
  { value: 'email', label: 'Email sent' },
  { value: 'call', label: 'Call made' },
  { value: 'meeting', label: 'Meeting held' },
  { value: 'demo', label: 'Demo delivered' },
  { value: 'proposal', label: 'Proposal sent' },
  { value: 'linkedin', label: 'LinkedIn touch' },
  { value: 'event', label: 'Event / conference' },
  { value: 'content_send', label: 'Content shared' },
  { value: 'other', label: 'Other' },
]

export interface LogInteractionPayload {
  action_type: string
  notes: string
  assigned_name: string
  assigned_role: string  // free-text; presets populate the dropdown but anything goes
  // Only present when advancing/editing stage
  new_stage?: InteractionStage
  outcome?: string
}

// 'log' = log an interaction without moving the stage
// 'advance' = forward motion (next stage highlighted by default)
// 'edit' = change stage to anything (including going backwards) — discoverable
//          via the Edit stage pencil button on the stepper header
interface Props {
  mode: 'log' | 'advance' | 'edit'
  currentStage: InteractionStage | null
  onClose: () => void
  onSubmit: (payload: LogInteractionPayload) => Promise<void>
}

// Modal that demands name + role before any interaction can be logged or stage
// advanced. This is the enforcement point for the "who changed it" requirement.
export default function LogInteractionModal({ mode, currentStage, onClose, onSubmit }: Props) {
  const [actionType, setActionType] = useState('meeting')
  const [details, setDetails] = useState('')
  const [name, setName] = useState('')
  // Role is free-text under the hood. The selector drives it via presets OR
  // switches to "Other" which reveals a custom input.
  const [rolePreset, setRolePreset] = useState<string>('')
  const [customRole, setCustomRole] = useState('')
  const effectiveRole = rolePreset === 'Other' ? customRole.trim() : rolePreset.trim()
  const [nextStage, setNextStage] = useState<InteractionStage>(
    mode === 'edit'
      ? currentStage ?? 'prospecting'
      : currentStage === 'prospecting' ? 'discovery' : currentStage ?? 'prospecting'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stageChanged = mode === 'log' ? false : nextStage !== currentStage
  const canSubmit = details.trim() && name.trim() && effectiveRole && (mode === 'log' || stageChanged)

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Fill all required fields before saving.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload: LogInteractionPayload = {
        action_type: mode === 'log' ? actionType : 'meeting',
        notes: details.trim(),
        assigned_name: name.trim(),
        assigned_role: effectiveRole,
      }
      if (mode !== 'log') {
        payload.new_stage = nextStage
        payload.outcome = mode === 'edit' ? 'stage_edited' : 'stage_advanced'
      }
      await onSubmit(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
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
            <h2 className="text-lg font-bold" style={{ color: '#00263E' }}>
              {mode === 'advance' ? 'Advance stage' : mode === 'edit' ? 'Edit stage' : 'Log interaction'}
            </h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {mode === 'advance'
                ? 'Move this account forward in the interaction workflow. Everyone on the team sees the new stage immediately.'
                : mode === 'edit'
                ? 'Change this account\'s stage — pick any stage, forward or backward. Log the reason and who you are so the team understands the move.'
                : 'Record what happened with this account. Keeps the team aligned on who did what, when.'}
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

        {/* Info banner — "why we ask for name + role" */}
        <div
          className="flex items-start gap-3 rounded-lg p-3 mb-4 text-xs"
          style={{ backgroundColor: '#E8F5F9', border: '1px solid #B6DCE1', color: '#0c4a6e' }}
        >
          <Users size={14} className="mt-0.5 shrink-0" />
          <span>
            Name + role are required so the team knows who moved this account or logged this touch. Anyone on the team can update — alignment comes from attribution, not permissions.
          </span>
        </div>

        {/* Stage picker — shown in both advance and edit modes */}
        {mode !== 'log' && (
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              {mode === 'edit' ? 'Change stage to' : 'New stage'} <span className="text-red-500">*</span>
            </label>
            <select
              value={nextStage}
              onChange={e => setNextStage(e.target.value as InteractionStage)}
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] bg-white"
              style={{ borderColor: 'var(--tulip-border)' }}
            >
              {STAGES.map(s => (
                <option
                  key={s.key}
                  value={s.key}
                  // In advance mode, disable picking the current stage (no-op move).
                  // In edit mode, allow picking any including current (lets the user
                  // confirm current state without moving — useful for audit trail).
                  disabled={mode === 'advance' && s.key === currentStage}
                >
                  {s.label}{s.key === currentStage ? '  (current)' : ''}
                </option>
              ))}
            </select>
            {nextStage && STAGE_BY_KEY[nextStage] && (
              <p className="text-[11px] text-gray-500 mt-1">{STAGE_BY_KEY[nextStage].tagline}</p>
            )}
          </div>
        )}

        {/* Log — pick action type */}
        {mode === 'log' && (
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Type of interaction <span className="text-red-500">*</span>
            </label>
            <select
              value={actionType}
              onChange={e => setActionType(e.target.value)}
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] bg-white"
              style={{ borderColor: 'var(--tulip-border)' }}
            >
              {ACTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Details */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            What happened <span className="text-red-500">*</span>
          </label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            rows={4}
            placeholder="2-3 sentences on what was discussed, who was involved, what the next step is"
            className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] resize-vertical"
            style={{ borderColor: 'var(--tulip-border)' }}
          />
        </div>

        {/* Name + role — always required. Role supports free text via "Other…". */}
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
              {ROLE_PRESETS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="Other">Other… (type it in)</option>
            </select>
          </div>
        </div>

        {/* Free-text role input — only shown when "Other" is picked */}
        {rolePreset === 'Other' && (
          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Custom role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customRole}
              onChange={e => setCustomRole(e.target.value)}
              placeholder="e.g. VP Revenue Operations, Solutions Engineer, Partner Manager"
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]"
              style={{ borderColor: 'var(--tulip-border)' }}
              autoFocus
            />
          </div>
        )}
        {rolePreset !== 'Other' && <div className="mb-2" />}

        {error && (
          <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        {/* Action buttons */}
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
            {submitting
              ? 'Saving…'
              : mode === 'advance' ? 'Advance stage'
              : mode === 'edit' ? 'Update stage'
              : 'Save interaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
