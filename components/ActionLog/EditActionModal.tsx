'use client'

import { useMemo, useState } from 'react'
import { X, Trash2, Plus, CopyPlus } from 'lucide-react'
import type { AccountAction, ActionType, TeamType } from '@/lib/database.types'
import { STAKEHOLDER_ROLE_PRESETS } from '@/lib/database.types'
import {
  parseStructuredNotes,
  isRichPlayNote,
  isStageMoveNote,
  serializeStructuredNotes,
  type StructuredNotes,
} from '@/lib/action-notes'

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
  // Fired when user clicks "Save as new action" — spawns a POST /api/actions
  // with the currently-edited values, leaves the original intact.
  onCreateNew?: (created: AccountAction) => void
  // When true, the modal is in "create from scratch" mode — primary Save
  // button POSTs a new action instead of PATCH-ing the template. Used by
  // the "+ Add new action" button above the interaction list.
  mode?: 'edit' | 'create'
}

// Full-field editor for an existing action. Detects whether the action has
// rich structured content in notes (play activation: opener / why_now / rationale
// / target / play_name) and renders per-field editors when it does — so the
// fields shown match the fields rendered on the card. Plain-text notes fall
// back to a single textarea.
export default function EditActionModal({ action, onClose, onSave, onCreateNew, mode = 'edit' }: Props) {
  const isCreate = mode === 'create'
  const structuredBase = useMemo(() => parseStructuredNotes(action.notes), [action.notes])
  // In create mode, force rich-field editing so the user gets opener/why_now/
  // rationale inputs even when the template starts empty.
  const isRich = isCreate ? true : isRichPlayNote(structuredBase)
  const isStageMove = isCreate ? false : isStageMoveNote(structuredBase)

  // ---- Base action fields (always editable) ----
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

  // ---- Rich structured fields (editable when present) ----
  const [playName, setPlayName] = useState(structuredBase?.play_name ?? '')
  const [target, setTarget] = useState(structuredBase?.target ?? '')
  const [opener, setOpener] = useState(structuredBase?.opener ?? '')
  const [whyNow, setWhyNow] = useState<string[]>(Array.isArray(structuredBase?.why_now) ? structuredBase!.why_now! : [])
  const [rationale, setRationale] = useState<string[]>(Array.isArray(structuredBase?.rationale) ? structuredBase!.rationale! : [])

  // ---- "Free-form note" — the only field from the old modal ----
  const [freeNote, setFreeNote] = useState(
    structuredBase?.note ?? (typeof action.notes === 'string' && !structuredBase ? action.notes : '')
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const effectiveRole = rolePreset === 'Other' ? customRole.trim() : rolePreset.trim()

  // Build the notes string that will be saved. Preserves every key in the
  // base structured object (including things we don't explicitly edit here
  // like activated_at, play_id) so data ISN'T lost on save.
  const buildNotes = (): string => {
    if (!structuredBase) {
      // Plain-text action — save whatever's in the free-form textarea
      return freeNote
    }
    // Structured action — merge edits back into the existing object
    const merged: StructuredNotes = { ...structuredBase }
    if (isRich) {
      merged.play_name = playName.trim() || null
      merged.target = target.trim() || null
      merged.opener = opener.trim() || null
      merged.why_now = whyNow.map(s => s.trim()).filter(Boolean)
      merged.rationale = rationale.map(s => s.trim()).filter(Boolean)
    }
    // `note` works for both rich (activator note) and stage-move shapes
    merged.note = freeNote.trim() || null
    return serializeStructuredNotes(merged)
  }

  const buildPayload = () => ({
    action_type: actionType,
    team,
    contact_name: contactName.trim() || null,
    outcome: outcome.trim() || null,
    notes: buildNotes(),
    assigned_name: name.trim() || null,
    assigned_role: effectiveRole || null,
  })

  const handleSave = async () => {
    if (isCreate) {
      // In create mode, the primary Save button spawns a new action via POST.
      await handleSaveAsNew()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      onSave(json.action)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSubmitting(false)
    }
  }

  // "Save as new" — POSTs a new action with all the current form values,
  // leaves the original row untouched. Useful for duplicating + editing a
  // rich play-style action for a different stakeholder, without re-typing.
  const handleSaveAsNew = async () => {
    if (!onCreateNew) return
    if (!name.trim()) { setError('Attribution name is required to create a new action.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        account_id: action.account_id,
        performed_by: name.trim(),
        ...buildPayload(),
      }
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Create failed')
      onCreateNew(json.action)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
      setSubmitting(false)
    }
  }

  // Dynamic bullet list editor — one line per bullet.
  const BulletList = ({ items, setItems, placeholder }: { items: string[]; setItems: (xs: string[]) => void; placeholder: string }) => (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="text-xs text-gray-400 italic">No bullets yet. Click Add below.</div>
      )}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#008CB9' }} />
          <textarea
            value={item}
            onChange={e => {
              const next = [...items]
              next[i] = e.target.value
              setItems(next)
            }}
            rows={2}
            placeholder={placeholder}
            className="flex-1 text-sm px-3 py-1.5 border rounded-md outline-none focus:border-[#008CB9] resize-vertical"
            style={{ borderColor: 'var(--tulip-border)', fontFamily: 'inherit' }}
          />
          <button
            type="button"
            onClick={() => setItems(items.filter((_, idx) => idx !== i))}
            aria-label="Remove bullet"
            className="mt-1 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, ''])}
        className="text-xs flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50"
        style={{ borderColor: 'var(--tulip-border)', color: 'var(--tulip-gray)' }}
      >
        <Plus size={12} /> Add bullet
      </button>
    </div>
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 100, padding: '32px 20px 20px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white', borderRadius: 12,
          maxWidth: 720, width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b" style={{ borderColor: 'var(--tulip-border)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#00263E' }}>
              {isCreate ? 'Add new action' : 'Edit action'}
              {isRich && !isCreate && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tulip-celery)', color: 'var(--tulip-navy)' }}>Play-style</span>}
              {isStageMove && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>Stage move</span>}
            </h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {isCreate
                ? 'Creates a brand-new action on this account, visible to everyone on your team. Fill in the play-style fields for a rich action, or just Type + Attribution for a quick log.'
                : isRich
                  ? 'Every field shown on the card below is editable here. Save as new to clone this action for a different stakeholder.'
                  : 'Change anything about this action. Changes are visible to the team immediately.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Type">
              <select value={actionType} onChange={e => setActionType(e.target.value as ActionType)} className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] bg-white" style={{ borderColor: 'var(--tulip-border)' }}>
                {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Team">
              <select value={team} onChange={e => setTeam(e.target.value as TeamType)} className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] bg-white" style={{ borderColor: 'var(--tulip-border)' }}>
                {TEAMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Contact (optional)" className="mb-3">
            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Person this action was with" className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]" style={{ borderColor: 'var(--tulip-border)' }} />
          </Field>

          <Field label="Outcome (optional)" className="mb-4">
            <input type="text" value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="e.g. replied, meeting booked, declined" className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]" style={{ borderColor: 'var(--tulip-border)' }} />
          </Field>

          {/* Rich play-style section — only rendered when structured notes indicate play activation */}
          {isRich && (
            <div className="mb-5 pb-5 border-b" style={{ borderColor: 'var(--tulip-border)' }}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">Play-style content</div>

              <div className="grid grid-cols-1 gap-3 mb-3">
                <Field label="Play name">
                  <input type="text" value={playName} onChange={e => setPlayName(e.target.value)} className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]" style={{ borderColor: 'var(--tulip-border)' }} />
                </Field>

                <Field label="Target (person + title)">
                  <input type="text" value={target} onChange={e => setTarget(e.target.value)} placeholder="Jodi Euerle Eddy, SVP, Enterprise Services and CIDO" className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]" style={{ borderColor: 'var(--tulip-border)' }} />
                </Field>
              </div>

              <Field label="Why this person now" className="mb-3" hint="Bullets. Each line rendered as its own point on the card.">
                <BulletList items={whyNow} setItems={setWhyNow} placeholder="Reason this stakeholder matters right now" />
              </Field>

              <Field label="Opener" className="mb-3" hint="First-person outreach opening. Gets rendered behind the Opener ▸ toggle on the card.">
                <textarea value={opener} onChange={e => setOpener(e.target.value)} rows={5} className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] resize-vertical" style={{ borderColor: 'var(--tulip-border)', fontFamily: 'inherit' }} />
              </Field>

              <Field label="Rationale" className="mb-1" hint="Why this is the right play. Bullets.">
                <BulletList items={rationale} setItems={setRationale} placeholder="Strategic rationale bullet" />
              </Field>
            </div>
          )}

          <Field label={structuredBase ? 'Activator note (internal)' : 'Notes'} className="mb-4" hint={structuredBase ? 'Optional note from whoever logged or activated this — separate from the opener above.' : undefined}>
            <textarea value={freeNote} onChange={e => setFreeNote(e.target.value)} rows={3} className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] resize-vertical" style={{ borderColor: 'var(--tulip-border)', fontFamily: 'inherit' }} />
          </Field>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label={<>Attributed to <span className="text-red-500">*</span></>}>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]" style={{ borderColor: 'var(--tulip-border)' }} />
            </Field>
            <Field label="Role">
              <select value={rolePreset} onChange={e => { setRolePreset(e.target.value); if (e.target.value !== 'Other') setCustomRole('') }} className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] bg-white" style={{ borderColor: 'var(--tulip-border)' }}>
                <option value="">None</option>
                {STAKEHOLDER_ROLE_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="Other">Other… (type it in)</option>
              </select>
            </Field>
          </div>
          {rolePreset === 'Other' && (
            <Field label="Custom role" className="mb-3">
              <input type="text" value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="e.g. VP Revenue Operations, Solutions Engineer" className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]" style={{ borderColor: 'var(--tulip-border)' }} autoFocus />
            </Field>
          )}

          {error && (
            <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--tulip-border)' }}>
          {/* "Save as new" button only makes sense in edit mode (creating a
              sibling of an existing action). In create mode, the primary
              Save button already POSTs. */}
          {!isCreate && onCreateNew ? (
            <button
              type="button"
              onClick={handleSaveAsNew}
              disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border hover:bg-gray-50"
              style={{ borderColor: 'var(--tulip-border)', color: 'var(--tulip-navy)' }}
              title="Create a new action with all these field values, leaving the original unchanged"
            >
              <CopyPlus size={14} /> Save as new action
            </button>
          ) : <span />}

          <div className="flex items-center gap-2">
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
              {submitting ? 'Saving…' : (isCreate ? 'Create action' : 'Save changes')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, className, children }: { label: React.ReactNode; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-[11px] text-gray-400 mt-1">{hint}</div>}
    </div>
  )
}
