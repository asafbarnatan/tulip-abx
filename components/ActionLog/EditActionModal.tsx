'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { AccountAction, ActionType, TeamType } from '@/lib/database.types'
import { STAKEHOLDER_ROLE_PRESETS } from '@/lib/database.types'

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'email',        label: 'Email' },
  { value: 'call',         label: 'Call' },
  { value: 'meeting',      label: 'Meeting' },
  { value: 'demo',         label: 'Demo' },
  { value: 'proposal',     label: 'Proposal' },
  { value: 'linkedin',     label: 'LinkedIn' },
  { value: 'event',        label: 'Event' },
  { value: 'content_send', label: 'Content shared' },
  { value: 'other',        label: 'Other' },
]

const TEAMS: { value: TeamType; label: string }[] = [
  { value: 'sales',     label: 'Sales' },
  { value: 'sdr',       label: 'SDR' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'cs',        label: 'Customer Success' },
]

interface Props {
  action: AccountAction
  onClose: () => void
  onSave: (updated: AccountAction) => void
}

// Full-field editor for an existing action. Opens from the pencil button on
// each card. The DELETE flow stays on the card with two-stage confirm — this
// modal is only for non-destructive edits.
export default function EditActionModal({ action, onClose, onSave }: Props) {
  const [actionType, setActionType] = useState<ActionType>(action.action_type)
  const [team, setTeam] = useState<TeamType>(action.team)
  const [contactName, setContactName] = useState(action.contact_name ?? '')
  const [outcome, setOutcome] = useState(action.outcome ?? '')
  const [name, setName] = useState(action.assigned_name ?? action.performed_by ?? '')
  const [rolePreset, setRolePreset] = useState<string>(
    action.assigned_role && STAKEHOLDER_ROLE_PRESETS.includes(action.assigned_role as typeof STAKEHOLDER_ROLE_PRESETS[number])
      ? action.assigned_role
      : action.assigned_role ? 'Other' : ''
  )
  const [customRole, setCustomRole] = useState(
    action.assigned_role && !STAKEHOLDER_ROLE_PRESETS.includes(action.assigned_role as typeof STAKEHOLDER_ROLE_PRESETS[number])
      ? action.assigned_role
      : ''
  )
  // Notes — if this action has JSON-structured notes (e.g. stage move or play
  // activation), editing the raw JSON is a foot-gun. We default to editing the
  // user-facing `note` field inside the structure when present.
  const structured = safeParse(action.notes)
  const [noteText, setNoteText] = useState(
    structured?.note ?? (typeof action.notes === 'string' && !structured ? action.notes : '')
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveRole = rolePreset === 'Other' ? customRole.trim() : rolePreset.trim()

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      // Preserve any structured notes (stage_move or play activation) by merging
      // the new `note` text back in. Legacy free-text notes save verbatim.
      const nextNotes = structured
        ? JSON.stringify({ ...structured, note: noteText })
        : noteText

      const res = await fetch(`/api/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          team,
          contact_name: contactName.trim() || null,
          outcome: outcome.trim() || null,
          notes: nextNotes,
          assigned_name: name.trim() || null,
          assigned_role: effectiveRole || null,
        }),
      })
      // The PATCH route currently only accepts a subset of fields; fall back
      // to the ones that ARE accepted.
      if (!res.ok) {
        // Try a narrower PATCH with just the supported fields.
        const fallbackRes = await fetch(`/api/actions/${action.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_name: contactName.trim() || null,
            outcome: outcome.trim() || null,
            notes: nextNotes,
            assigned_name: name.trim() || null,
            assigned_role: effectiveRole || null,
          }),
        })
        const json = await fallbackRes.json()
        if (!fallbackRes.ok) throw new Error(json.error ?? 'Save failed')
        onSave(json.action)
        return
      }
      const json = await res.json()
      onSave(json.action)
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
            <h2 className="text-lg font-bold" style={{ color: '#00263E' }}>Edit action</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Change anything about this action. Changes are visible to the team immediately.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Type</label>
            <select
              value={actionType}
              onChange={e => setActionType(e.target.value as ActionType)}
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] bg-white"
              style={{ borderColor: 'var(--tulip-border)' }}
            >
              {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Team</label>
            <select
              value={team}
              onChange={e => setTeam(e.target.value as TeamType)}
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] bg-white"
              style={{ borderColor: 'var(--tulip-border)' }}
            >
              {TEAMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Contact (optional)</label>
          <input
            type="text"
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            placeholder="Person this action was with"
            className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]"
            style={{ borderColor: 'var(--tulip-border)' }}
          />
        </div>

        <div className="mb-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Outcome (optional)</label>
          <input
            type="text"
            value={outcome}
            onChange={e => setOutcome(e.target.value)}
            placeholder="e.g. replied, meeting booked, declined"
            className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]"
            style={{ borderColor: 'var(--tulip-border)' }}
          />
        </div>

        <div className="mb-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            {structured ? 'Note (the original play/stage context is preserved)' : 'Notes'}
          </label>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={4}
            className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] resize-vertical"
            style={{ borderColor: 'var(--tulip-border)' }}
          />
        </div>

        {/* Name + role */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Attributed to <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]"
              style={{ borderColor: 'var(--tulip-border)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Role</label>
            <select
              value={rolePreset}
              onChange={e => {
                setRolePreset(e.target.value)
                if (e.target.value !== 'Other') setCustomRole('')
              }}
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] bg-white"
              style={{ borderColor: 'var(--tulip-border)' }}
            >
              <option value="">None</option>
              {STAKEHOLDER_ROLE_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="Other">Other… (type it in)</option>
            </select>
          </div>
        </div>
        {rolePreset === 'Other' && (
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Custom role</label>
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

        {error && (
          <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-2">
          <button type="button" onClick={onClose} disabled={submitting}
            className="text-sm px-4 py-2 rounded-md border hover:bg-gray-50"
            style={{ borderColor: 'var(--tulip-border)', color: 'var(--tulip-gray)' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={submitting || !name.trim()}
            className="text-sm font-semibold px-4 py-2 rounded-md"
            style={{
              backgroundColor: name.trim() ? '#00263E' : '#94a3b8',
              color: 'white',
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function safeParse(raw: string | null): { note?: string; [key: string]: unknown } | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch { /* not JSON */ }
  return null
}
