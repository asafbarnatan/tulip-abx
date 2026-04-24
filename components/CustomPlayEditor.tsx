'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { CustomPlay } from '@/lib/database.types'

// Form shape matches the CustomPlay row, minus server-managed fields.
// Used for both create (no `id`) and edit (pass an `initial` row).
export interface CustomPlayFormValues {
  name: string
  description: string
  play_type: CustomPlay['play_type']
  owner_team: CustomPlay['owner_team']
  duration_days: number
  sample_outreach_opener: string
  expected_outcome: string
  assets: string[]
  created_by_name?: string
  created_by_role?: string
}

interface Props {
  accountId: string
  accountName: string
  initial?: CustomPlay | null  // null/undefined → create mode
  onClose: () => void
  onSaved: (play: CustomPlay) => void
}

const PLAY_TYPES: Array<{ value: CustomPlay['play_type']; label: string }> = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'event', label: 'Event' },
  { value: 'exec', label: 'Executive' },
  { value: 'demo', label: 'Demo' },
  { value: 'cs_expansion', label: 'CS / Expansion' },
  { value: 'content', label: 'Content' },
]

const TEAMS: Array<{ value: CustomPlay['owner_team']; label: string }> = [
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sdr', label: 'SDR' },
  { value: 'cs', label: 'Customer Success' },
]

export default function CustomPlayEditor({ accountId, accountName, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [playType, setPlayType] = useState<CustomPlay['play_type']>(initial?.play_type ?? 'outbound')
  const [ownerTeam, setOwnerTeam] = useState<CustomPlay['owner_team']>(initial?.owner_team ?? 'sales')
  const [durationDays, setDurationDays] = useState<number>(initial?.duration_days ?? 14)
  const [opener, setOpener] = useState(initial?.sample_outreach_opener ?? '')
  const [expectedOutcome, setExpectedOutcome] = useState(initial?.expected_outcome ?? '')
  const [assetsText, setAssetsText] = useState((initial?.assets ?? []).join('\n'))
  const [createdByName, setCreatedByName] = useState(initial?.created_by_name ?? '')
  const [createdByRole, setCreatedByRole] = useState(initial?.created_by_role ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Esc closes the modal — matches the campaign + action modals' pattern.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Play name is required.'); return }
    // Creator attribution required on NEW plays only — on edit, preserve whatever
    // was there originally (server ignores undefined fields on PATCH).
    if (!isEdit && !createdByName.trim()) { setError('Your name is required so the team knows who added this play.'); return }

    setSaving(true)
    setError(null)
    const assets = assetsText.split('\n').map(a => a.trim()).filter(Boolean)
    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
      play_type: playType,
      owner_team: ownerTeam,
      duration_days: durationDays,
      sample_outreach_opener: opener.trim(),
      expected_outcome: expectedOutcome.trim(),
      assets,
    }
    if (!isEdit) {
      body.account_id = accountId
      body.created_by_name = createdByName.trim()
      body.created_by_role = createdByRole.trim() || null
    }

    try {
      const url = isEdit ? `/api/custom-plays/${initial!.id}` : '/api/custom-plays'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      onSaved(data.play)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0, 38, 62, 0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 20px 20px', overflowY: 'auto',
      }}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
        style={{
          backgroundColor: 'white', borderRadius: 12,
          width: '100%', maxWidth: 720,
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--tulip-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--tulip-gray)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              {isEdit ? 'Edit custom play' : 'Add custom play'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tulip-navy)', marginTop: 2 }}>{accountName}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Play name" required>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Quick Cork-facility IT/OT data backbone workshop"
              maxLength={200}
              style={inputStyle}
              autoFocus
            />
          </Field>

          <Field label="Description" hint="What this play does and when to run it.">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Field label="Play type">
              <select value={playType} onChange={e => setPlayType(e.target.value as CustomPlay['play_type'])} style={inputStyle}>
                {PLAY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Owner team">
              <select value={ownerTeam} onChange={e => setOwnerTeam(e.target.value as CustomPlay['owner_team'])} style={inputStyle}>
                {TEAMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Duration (days)">
              <input
                type="number" min={1} max={365}
                value={durationDays}
                onChange={e => setDurationDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Sample outreach opener" hint="First-person opener an AE could send as-is.">
            <textarea
              value={opener}
              onChange={e => setOpener(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="I wanted to flag something specific to your Cork greenfield ramp…"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

          <Field label="Expected outcome" hint="What success looks like.">
            <input
              value={expectedOutcome}
              onChange={e => setExpectedOutcome(e.target.value)}
              maxLength={1000}
              placeholder="Scheduled discovery call with SVP Global Ops within 14 days"
              style={inputStyle}
            />
          </Field>

          <Field label="Assets" hint="One per line. Links, docs, case studies.">
            <textarea
              value={assetsText}
              onChange={e => setAssetsText(e.target.value)}
              rows={3}
              placeholder={'Factory Playback product page (tulip.co)\nCork facility one-pager'}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

          {!isEdit && (
            <div style={{
              padding: 14, borderRadius: 8, border: '1px solid var(--tulip-border)',
              backgroundColor: 'var(--tulip-cream)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--tulip-navy)', fontWeight: 600, marginBottom: 8 }}>
                Who is adding this play?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <Field label="Your name" required>
                  <input value={createdByName} onChange={e => setCreatedByName(e.target.value)} placeholder="Asaf Bar Natan" maxLength={200} style={inputStyle} />
                </Field>
                <Field label="Role">
                  <input value={createdByRole} onChange={e => setCreatedByRole(e.target.value)} placeholder="AE" maxLength={100} style={inputStyle} />
                </Field>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 6, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--tulip-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '9px 18px', borderRadius: 6,
              backgroundColor: 'transparent', border: '1px solid var(--tulip-border)',
              color: 'var(--tulip-gray)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '9px 22px', borderRadius: 6,
              backgroundColor: 'var(--tulip-navy)', border: 'none',
              color: 'var(--tulip-celery)', fontSize: 13, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Add play')}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1px solid var(--tulip-border)', borderRadius: 6,
  backgroundColor: 'white', color: 'var(--tulip-navy)',
  outline: 'none',
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--tulip-gray)', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--tulip-gray)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}
