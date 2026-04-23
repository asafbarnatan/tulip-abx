'use client'

import { useState } from 'react'
import type { AccountAction, ActionType, TeamType, Contact, StakeholderRole, InteractionStage } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, Phone, Video, Link2, Calendar, FileText, Presentation, Send, Plus, X, CheckCircle, UserPlus, ArrowRight, Activity, Trash2, Pencil } from 'lucide-react'
import StageStepper from '@/components/ActionLog/StageStepper'
import LogInteractionModal, { type LogInteractionPayload } from '@/components/ActionLog/LogInteractionModal'
import EditActionModal from '@/components/ActionLog/EditActionModal'

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  email:        <Mail className="w-4 h-4" />,
  call:         <Phone className="w-4 h-4" />,
  meeting:      <Video className="w-4 h-4" />,
  linkedin:     <Link2 className="w-4 h-4" />,
  event:        <Calendar className="w-4 h-4" />,
  content_send: <FileText className="w-4 h-4" />,
  demo:         <Presentation className="w-4 h-4" />,
  proposal:     <Send className="w-4 h-4" />,
  other:        <CheckCircle className="w-4 h-4" />,
}

const TEAM_COLORS: Record<TeamType, string> = {
  marketing: 'bg-purple-100 text-purple-700',
  sales:     'bg-blue-100 text-blue-700',
  sdr:       'bg-amber-100 text-amber-700',
  cs:        'bg-green-100 text-green-700',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) {
    const hours = Math.floor(diff / 3600000)
    if (hours === 0) return 'Just now'
    return `${hours}h ago`
  }
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export default function ActionLog({
  accountId,
  initialActions,
  contacts,
  initialInteractionStage,
}: {
  accountId: string
  initialActions: AccountAction[]
  contacts: Contact[]
  initialInteractionStage?: InteractionStage | null
}) {
  const [actions, setActions] = useState<AccountAction[]>(initialActions)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [interactionStage, setInteractionStage] = useState<InteractionStage | null>(initialInteractionStage ?? 'prospecting')
  const [modalMode, setModalMode] = useState<'log' | 'advance' | 'edit' | null>(null)
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const [form, setForm] = useState({
    action_type: 'email' as ActionType,
    performed_by: '',
    team: 'sales' as TeamType,
    contact_name: '' as string,
    outcome: '',
    notes: '',
  })

  // Stage-aware submit — handles both "log interaction" and "advance stage" from
  // the new modal. If mode='advance'|'edit', also PATCHes the account's
  // interaction_stage and embeds from_stage/to_stage in the action's notes JSON
  // so deletion can roll back cleanly.
  async function submitFromModal(payload: LogInteractionPayload): Promise<void> {
    // For stage moves: encode the transition as structured JSON in notes so we
    // can roll back on delete.
    const notesForDb = payload.new_stage
      ? JSON.stringify({
          from_stage: interactionStage ?? 'prospecting',
          to_stage: payload.new_stage,
          note: payload.notes,
        })
      : payload.notes

    // 1. Write the action row with assigned_name + assigned_role embedded.
    const actionRes = await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        action_type: payload.action_type,
        performed_by: payload.assigned_name,
        team: payload.assigned_role.toLowerCase() === 'ae' || payload.assigned_role.toLowerCase() === 'sales'
          ? 'sales'
          : payload.assigned_role.toLowerCase() === 'csm'
            ? 'cs'
            : payload.assigned_role.toLowerCase() === 'marketing'
              ? 'marketing'
              : 'sdr',
        contact_name: null,
        outcome: payload.outcome ?? null,
        notes: notesForDb,
        assigned_name: payload.assigned_name,
        assigned_role: payload.assigned_role,
      }),
    })
    const actionJson = await actionRes.json()
    if (!actionRes.ok) throw new Error(actionJson.error ?? 'Action save failed')

    // 2. If advancing stage, PATCH the account's interaction_stage.
    if (payload.new_stage) {
      const stageRes = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interaction_stage: payload.new_stage }),
      })
      if (!stageRes.ok) {
        const err = await stageRes.json().catch(() => ({}))
        throw new Error(err.error ?? 'Stage update failed')
      }
      setInteractionStage(payload.new_stage)
    }

    // 3. Update local state with the new action at the top of the feed.
    setActions(prev => [actionJson.action, ...prev])
    setModalMode(null)
    setSavedToast(payload.new_stage
      ? `Stage moved to ${payload.new_stage.replace('_', ' ')}. Logged by ${payload.assigned_name} (${payload.assigned_role}).`
      : `Interaction logged by ${payload.assigned_name} (${payload.assigned_role}).`)
    setTimeout(() => setSavedToast(null), 4500)
  }

  async function submitAction() {
    if (!form.performed_by.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, ...form }),
      })
      const json = await res.json()
      if (res.ok) {
        setActions(prev => [json.action, ...prev])
        setShowForm(false)
        setForm({ action_type: 'email', performed_by: '', team: 'sales', contact_name: '', outcome: '', notes: '' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stage stepper — shows the current client interaction stage visually */}
      <StageStepper current={interactionStage} onEditClick={() => setModalMode('edit')} />

      {/* Primary actions — advance stage + log interaction */}
      <div className="bg-white border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
           style={{ borderColor: 'var(--tulip-border)' }}>
        <div>
          <h3 className="font-semibold" style={{ color: '#00263E' }}>
            {actions.length} interaction{actions.length === 1 ? '' : 's'} logged
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Anyone on your team can update the stage or log a touchpoint. Name + role are required so everyone knows who moved things.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setModalMode('advance')}
            variant="default"
            style={{ backgroundColor: '#00263E', color: '#F2EEA1' }}
          >
            <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
            Advance stage
          </Button>
          <Button
            size="sm"
            onClick={() => setModalMode('log')}
            variant="outline"
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            Log interaction
          </Button>
          <Button size="sm" onClick={() => setShowForm(v => !v)} variant="ghost" className="text-xs text-gray-500">
            {showForm ? 'Hide quick log' : 'Quick log'}
          </Button>
        </div>
      </div>

      {/* Saved toast */}
      {savedToast && (
        <div
          className="rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm"
          style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534' }}
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{savedToast}</span>
        </div>
      )}

      {/* Modal — enforces name + role capture */}
      {modalMode && (
        <LogInteractionModal
          mode={modalMode}
          currentStage={interactionStage}
          onClose={() => setModalMode(null)}
          onSubmit={submitFromModal}
        />
      )}

      {/* Log action form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-sm" style={{ color: '#00263E' }}>Log a touchpoint</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Action type</label>
              <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v as ActionType }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['email','call','meeting','linkedin','event','content_send','demo','proposal','other'] as ActionType[]).map(t => (
                    <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Team</label>
              <Select value={form.team} onValueChange={v => setForm(f => ({ ...f, team: v as TeamType }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="sdr">SDR</SelectItem>
                  <SelectItem value="cs">CS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Your name</label>
              <input
                className="w-full border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
                placeholder="e.g. Asaf Bar Natan"
                value={form.performed_by}
                onChange={e => setForm(f => ({ ...f, performed_by: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Contact</label>
              <Select value={form.contact_name} onValueChange={v => setForm(f => ({ ...f, contact_name: v ?? '' }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select contact…" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name} — {c.title}</SelectItem>
                  ))}
                  <SelectItem value="general">General / Account level</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Outcome</label>
              <input
                className="w-full border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
                placeholder="e.g. Meeting scheduled, No response, Positive"
                value={form.outcome}
                onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
            <Textarea
              rows={2}
              placeholder="What was discussed or observed?"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="text-sm resize-none"
            />
          </div>
          <Button
            onClick={submitAction}
            disabled={submitting || !form.performed_by.trim()}
            className="text-white w-full"
            style={{ backgroundColor: '#00263E' }}
          >
            {submitting ? 'Logging…' : 'Log Action'}
          </Button>
        </div>
      )}

      {/* Action feed */}
      {actions.length === 0 && !showForm ? (
        <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
          <p className="font-medium">No actions logged yet.</p>
          <p className="text-sm mt-1">Log the first touchpoint to start building the account&apos;s activity history.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              currentStage={interactionStage}
              onUpdate={updated => {
                setActions(prev => prev.map(a => a.id === updated.id ? updated : a))
              }}
              onDelete={async (deletedAction, rollbackStage) => {
                // If the deleted action was a stage move, PATCH the account's
                // interaction_stage back to the recorded from_stage first.
                if (rollbackStage) {
                  try {
                    await fetch(`/api/accounts/${accountId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ interaction_stage: rollbackStage }),
                    })
                    setInteractionStage(rollbackStage as InteractionStage)
                    setSavedToast(`Stage rolled back to ${String(rollbackStage).replace('_', ' ')}.`)
                    setTimeout(() => setSavedToast(null), 4500)
                  } catch {
                    // Non-fatal — delete still succeeded, user can fix stage manually.
                  }
                }
                setActions(prev => prev.filter(a => a.id !== deletedAction.id))
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Parses a structured stage-move JSON from action.notes, if present. Returns
// { from_stage, to_stage, note } when the action originated from an advance/edit
// stage modal, else null. Silent failure — legacy or free-text notes just
// return null and the card renders as a normal action.
interface StageMove { from_stage: string; to_stage: string; note: string }
function parseStageMove(action: AccountAction): StageMove | null {
  if (!action.notes) return null
  if (action.outcome !== 'stage_advanced' && action.outcome !== 'stage_edited') return null
  try {
    const parsed = JSON.parse(action.notes)
    if (parsed && typeof parsed === 'object' && 'from_stage' in parsed && 'to_stage' in parsed) {
      return {
        from_stage: String(parsed.from_stage),
        to_stage: String(parsed.to_stage),
        note: typeof parsed.note === 'string' ? parsed.note : '',
      }
    }
  } catch {
    // Not JSON — legacy free-text stage move. Fall through.
  }
  return null
}

// Pretty-prints a stage key (e.g. "demo_eval" → "Demo & Evaluation").
function prettyStage(key: string): string {
  const map: Record<string, string> = {
    prospecting: 'Prospecting',
    discovery: 'Discovery',
    demo_eval: 'Demo & Evaluation',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    closed_won: 'Closed-Won',
    onboarding: 'Onboarding',
    adoption: 'Adoption',
    expansion: 'Expansion',
    renewal: 'Renewal',
    closed_lost: 'Closed-Lost',
  }
  return map[key] ?? key.replace(/_/g, ' ')
}

// Preset role chip colors — any role string not in this map falls through to a
// neutral slate chip. This supports the free-text role feature: a user who types
// "VP Rev Ops" still gets a valid chip rendering.
const STAKEHOLDER_COLORS: Record<string, string> = {
  AE:         'bg-[#00263E] text-[#F2EEA1]',
  CSM:        'bg-green-700 text-white',
  Sales:      'bg-blue-700 text-white',
  Marketing:  'bg-purple-700 text-white',
  Ecosystem:  'bg-amber-600 text-white',
}
const ROLE_CHIP_NEUTRAL = 'bg-slate-700 text-white'

function ActionCard({
  action,
  currentStage,
  onUpdate,
  onDelete,
}: {
  action: AccountAction
  currentStage?: InteractionStage | null
  onUpdate: (a: AccountAction) => void
  onDelete: (action: AccountAction, rollbackStage: string | null) => void | Promise<void>
}) {
  const icon = ACTION_ICONS[action.action_type]
  const teamColor = TEAM_COLORS[action.team]
  const [assigning, setAssigning] = useState(false)
  const [patching, setPatching] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftRole, setDraftRole] = useState<StakeholderRole | ''>('')
  // Two-stage delete: first click arms (show "Confirm delete"), second click commits.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Full-edit modal — opens from the pencil button.
  const [editingFull, setEditingFull] = useState(false)

  // Parse notes for stage-move context — if present, show rollback messaging
  // in the delete confirmation and trigger stage PATCH on delete.
  const stageMove = parseStageMove(action)

  const armDelete = () => {
    setConfirmingDelete(true)
    setTimeout(() => setConfirmingDelete(prev => prev ? false : prev), 8000)
  }
  const commitDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/actions/${action.id}`, { method: 'DELETE' })
      if (res.ok) await onDelete(action, stageMove?.from_stage ?? null)
    } finally {
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }
  const currentRole = action.assigned_role ?? null
  const currentName = action.assigned_name ?? null
  const performedByLooksFabricated =
    !!action.performed_by &&
    /^[A-Z][a-z]+ [A-Z]/.test(action.performed_by) &&
    !['AE', 'CSM', 'Sales', 'Marketing', 'Ecosystem', 'Tulip'].some(k => action.performed_by!.includes(k))

  const startAssigning = () => {
    setDraftName(currentName ?? '')
    setDraftRole(currentRole ?? '')
    setAssigning(true)
  }

  const saveAssignment = async () => {
    const role = draftRole || null
    const name = draftName.trim() || null
    if (!role && !name) { setAssigning(false); return }
    setPatching(true)
    try {
      const res = await fetch(`/api/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_role: role, assigned_name: name }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdate(data.action)
      }
    } finally {
      setPatching(false)
      setAssigning(false)
    }
  }

  const clearAssignment = async () => {
    setPatching(true)
    try {
      const res = await fetch(`/api/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_role: null, assigned_name: null }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdate(data.action)
      }
    } finally {
      setPatching(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4 flex items-start gap-3 relative group">
      <div className="p-2 rounded-lg bg-gray-100 text-gray-600 shrink-0">{icon}</div>

      {/* Edit (pencil) — opens full-field edit modal. Left of delete, same behavior: shows on hover */}
      <div className="absolute top-2 right-10 z-10">
        {!confirmingDelete && (
          <button
            type="button"
            onClick={() => setEditingFull(true)}
            title="Edit this action"
            aria-label="Edit action"
            className="p-1.5 rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:text-[#008CB9] hover:bg-sky-50 transition-all"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editingFull && (
        <EditActionModal
          action={action}
          onClose={() => setEditingFull(false)}
          onSave={updated => {
            onUpdate(updated)
            setEditingFull(false)
          }}
        />
      )}

      {/* Delete control — two-stage confirm with stage-rollback context if applicable */}
      <div className="absolute top-2 right-2 z-10">
        {confirmingDelete ? (
          <div
            className="bg-white border rounded-lg shadow-lg p-3"
            style={{ borderColor: '#fca5a5', maxWidth: 340 }}
          >
            {stageMove ? (
              <div className="mb-2 text-[11px] leading-relaxed" style={{ color: '#991B1B' }}>
                <div className="font-bold mb-1 flex items-center gap-1">
                  <Trash2 size={11} /> Delete this stage move?
                </div>
                <div className="text-gray-700 font-normal">
                  This action moved the account from <strong>{prettyStage(stageMove.from_stage)}</strong> to <strong>{prettyStage(stageMove.to_stage)}</strong>. Deleting it will <strong>roll the stage back to {prettyStage(stageMove.from_stage)}</strong> and the current stage <strong>{currentStage ? prettyStage(currentStage) : ''}</strong> will no longer apply.
                </div>
              </div>
            ) : (
              <div className="mb-2 text-[11px] leading-relaxed" style={{ color: '#991B1B' }}>
                <div className="font-bold mb-1 flex items-center gap-1">
                  <Trash2 size={11} /> Delete this action?
                </div>
                <div className="text-gray-700 font-normal">
                  Permanently removes the log entry. The interaction stage is unchanged.
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-[11px] text-gray-500 px-2 py-1 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitDelete}
                disabled={deleting}
                className="text-[11px] font-bold px-3 py-1 rounded"
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                {deleting ? 'Deleting…' : (stageMove ? `Delete + roll back stage` : 'Delete')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={armDelete}
            title={stageMove
              ? `Delete this action (will roll stage back to ${prettyStage(stageMove.from_stage)})`
              : 'Delete this action'}
            aria-label="Delete action"
            className="p-1.5 rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-8">
        {/* Stage-move badge — shown when this action moved the interaction stage */}
        {stageMove && (
          <div className="mb-2 rounded-md px-2.5 py-1 inline-flex items-center gap-1.5 text-[11px] font-semibold"
               style={{ backgroundColor: '#F0F9FF', color: '#0c4a6e', border: '1px solid #B6DCE1' }}>
            <ArrowRight size={11} />
            <span>{prettyStage(stageMove.from_stage)}</span>
            <span className="text-gray-400">→</span>
            <span style={{ color: '#00263E' }}>{prettyStage(stageMove.to_stage)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {currentRole || currentName ? (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider inline-flex items-center gap-1.5 ${currentRole ? (STAKEHOLDER_COLORS[currentRole] ?? ROLE_CHIP_NEUTRAL) : 'bg-gray-200 text-gray-700'}`}>
              {currentName && <span className="normal-case tracking-normal">{currentName}</span>}
              {currentName && currentRole && <span className="opacity-60">·</span>}
              {currentRole && <span>{currentRole}</span>}
              <button
                type="button"
                onClick={startAssigning}
                aria-label="Edit assignment"
                className="hover:opacity-70 ml-0.5"
                disabled={patching}
                title="Edit"
              >
                <UserPlus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={clearAssignment}
                aria-label="Unassign"
                className="hover:opacity-70"
                disabled={patching}
                title="Clear"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ) : (
            <button
              onClick={startAssigning}
              aria-label="Assign to a Tulip person"
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-dashed border-gray-300 hover:border-gray-500 hover:text-gray-700 text-gray-500 flex items-center gap-1"
            >
              <UserPlus className="w-2.5 h-2.5" />
              Assign
            </button>
          )}

          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${teamColor}`}>
            {action.team.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500 capitalize">{action.action_type.replace('_', ' ')}</span>
          {action.contact_name && (
            <span className="text-xs text-gray-400">→ {action.contact_name}</span>
          )}
          {performedByLooksFabricated && !currentRole && !currentName && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium"
              title={`Legacy "performed_by" value: ${action.performed_by}. Assign a real Tulip stakeholder to clear.`}
            >
              legacy author
            </span>
          )}
        </div>
        {assigning && (
          <div className="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="grid grid-cols-5 gap-2">
              <input
                className="col-span-3 border rounded px-2 h-8 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
                placeholder="Tulip person (e.g. Asaf Bar Natan)"
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                disabled={patching}
                autoFocus
              />
              <select
                className="col-span-2 border rounded px-2 h-8 text-xs bg-white"
                value={draftRole}
                onChange={e => setDraftRole(e.target.value as StakeholderRole | '')}
                disabled={patching}
              >
                <option value="">Role…</option>
                <option value="AE">AE</option>
                <option value="CSM">CSM</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Ecosystem">Ecosystem</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setAssigning(false)}
                className="text-[11px] text-gray-500 hover:text-gray-800 px-2"
                disabled={patching}
              >
                Cancel
              </button>
              <button
                onClick={saveAssignment}
                disabled={patching || (!draftName.trim() && !draftRole)}
                className="text-[11px] font-semibold px-3 h-7 rounded text-white disabled:opacity-50"
                style={{ backgroundColor: '#00263E' }}
              >
                {patching ? 'Saving…' : 'Assign'}
              </button>
            </div>
          </div>
        )}
        {action.outcome && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#008CB9' }} />
            <span className="text-xs font-medium text-gray-700">{action.outcome}</span>
          </div>
        )}
        {/* For stage-move actions: show the user's note text instead of the raw JSON */}
        {stageMove ? (
          stageMove.note && (
            <p className="text-sm text-gray-700 leading-relaxed mt-2">{stageMove.note}</p>
          )
        ) : (
          action.notes && <ActionNotesRendered notes={action.notes} />
        )}
      </div>
      <span className="text-xs text-gray-400 shrink-0">{timeAgo(action.created_at)}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// ActionNotesRendered — turns a long action notes paragraph into sections:
//   TARGET · WHY NOW (bullets) · OPENER (collapsed) · RATIONALE (bullets)
// Falls back to plain text if the content doesn't look structured.
// ─────────────────────────────────────────────────────────────────────────
function ActionNotesRendered({ notes }: { notes: string }) {
  const [openerOpen, setOpenerOpen] = useState(false)
  const parsed = parseActionNotes(notes)

  if (!parsed.hasStructure) {
    // Simple bullet split — headline first sentence, bullets after
    const sentences = notes.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean)
    if (sentences.length <= 1) {
      return <p className="text-xs text-gray-600 leading-relaxed">{notes}</p>
    }
    const [headline, ...rest] = sentences
    const bullets = rest.flatMap(s => s.split(/\s+—\s+/)).map(s => s.replace(/[.]$/, '').trim()).filter(s => s.length > 5).slice(0, 4)
    return (
      <div>
        <p className="text-[13px] font-semibold text-gray-900 leading-snug mb-1">{headline}</p>
        {bullets.length > 0 && (
          <ul className="space-y-1" role="list">
            {bullets.map((b, i) => (
              <li key={i} className="text-xs text-gray-600 leading-snug flex items-start gap-1.5">
                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#008CB9' }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2.5 text-xs">
      {parsed.target && (
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.08em] mb-0.5">Target</div>
          <div className="text-gray-800">{parsed.target}</div>
        </div>
      )}
      {parsed.whyNow.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.08em] mb-1">Why this person now</div>
          <ul className="space-y-1">
            {parsed.whyNow.map((b, i) => (
              <li key={i} className="text-gray-700 leading-snug flex items-start gap-1.5">
                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#008CB9' }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {parsed.opener && (
        <div>
          <button
            onClick={() => setOpenerOpen(v => !v)}
            className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.08em] hover:text-gray-700 flex items-center gap-1"
          >
            Opener {openerOpen ? '▾' : '▸'}
          </button>
          {openerOpen && (
            <p className="mt-1 text-gray-700 leading-relaxed border-l-2 pl-2 italic" style={{ borderColor: '#008CB9' }}>
              {parsed.opener}
            </p>
          )}
        </div>
      )}
      {parsed.rationale.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.08em] mb-1">Rationale</div>
          <ul className="space-y-1">
            {parsed.rationale.map((b, i) => (
              <li key={i} className="text-gray-700 leading-snug flex items-start gap-1.5">
                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#94a3b8' }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function parseActionNotes(notes: string): {
  hasStructure: boolean
  target: string | null
  whyNow: string[]
  opener: string | null
  rationale: string[]
} {
  // Try to parse as structured JSON first — future-proofing for when PlayOrchestratorAgent emits JSON
  try {
    const trimmed = notes.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const j = JSON.parse(trimmed)
      if (j && (j.target || j.why_now || j.opener || j.rationale)) {
        return {
          hasStructure: true,
          target: j.target ?? null,
          whyNow: Array.isArray(j.why_now) ? j.why_now : [],
          opener: j.opener ?? null,
          rationale: Array.isArray(j.rationale) ? j.rationale : [],
        }
      }
    }
  } catch { /* fall through */ }

  // Attempt heuristic markdown-label parsing (e.g., "Target: ...\nWhy now: ...\nOpener: ...")
  const labelPattern = /(target|why(?:\s*(?:this person)?\s*now)?|opener|rationale)\s*:/gi
  if (labelPattern.test(notes)) {
    const result = { hasStructure: true, target: null as string | null, whyNow: [] as string[], opener: null as string | null, rationale: [] as string[] }
    const parts = notes.split(/\n?(?=(?:target|why\s*(?:this person\s*)?now|opener|rationale)\s*:)/i)
    for (const part of parts) {
      const m = part.match(/^(target|why\s*(?:this person\s*)?now|opener|rationale)\s*:\s*([\s\S]+)$/i)
      if (!m) continue
      const label = m[1].toLowerCase()
      const body = m[2].trim()
      if (label.startsWith('target')) result.target = body.split('\n')[0].trim()
      else if (label.startsWith('why')) result.whyNow = body.split(/\n|\s*—\s*/).map(s => s.trim().replace(/^[-•*]\s*/, '')).filter(Boolean).slice(0, 4)
      else if (label.startsWith('opener')) result.opener = body
      else if (label.startsWith('rationale')) result.rationale = body.split(/\n|\s*—\s*/).map(s => s.trim().replace(/^[-•*]\s*/, '')).filter(Boolean).slice(0, 4)
    }
    return result
  }

  return { hasStructure: false, target: null, whyNow: [], opener: null, rationale: [] }
}
