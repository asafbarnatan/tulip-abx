'use client'

import { useState } from 'react'
import type { PositioningBrief, PositioningStatement, Contact } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Sparkles, CheckCircle, Copy, Check, RefreshCw, Shield, Pencil, Save, X, Users } from 'lucide-react'
import PositioningStatementEditor from '@/components/BriefEditor/PositioningStatementEditor'
import KeyThemesEditor from '@/components/BriefEditor/KeyThemesEditor'
import PersonaMessagesEditor from '@/components/BriefEditor/PersonaMessagesEditor'
import StringListEditor from '@/components/BriefEditor/StringListEditor'
import ObjectionHandlersEditor from '@/components/BriefEditor/ObjectionHandlersEditor'
import StrategicNarrativeEditor from '@/components/BriefEditor/StrategicNarrativeEditor'

const TONE_OPTIONS = ['consultative', 'challenger', 'empathetic', 'technical', 'executive'] as const

// Shape held in edit mode before commit. Mirrors the saveable subset of PositioningBrief.
interface BriefDraft {
  positioning_statement: PositioningStatement | null
  core_message: string
  key_themes: string[]
  persona_messages: Record<string, string>
  proof_points: string[]
  objection_handlers: Array<{ objection: string; response: string }>
  recommended_tone: string
}

function draftFromBrief(b: PositioningBrief): BriefDraft {
  return {
    positioning_statement: b.positioning_statement,
    core_message: b.core_message ?? '',
    key_themes: b.key_themes ?? [],
    persona_messages: b.persona_messages ?? {},
    proof_points: b.proof_points ?? [],
    objection_handlers: b.objection_handlers ?? [],
    recommended_tone: b.recommended_tone ?? 'consultative',
  }
}

function lcFirst(s: string): string {
  if (!s) return s
  const first = s[0]
  if (first !== first.toLowerCase() && s.slice(1, 3) === s.slice(1, 3).toLowerCase()) {
    return first.toLowerCase() + s.slice(1)
  }
  return s
}

function splitTheme(theme: string): { title: string; description: string } {
  const parts = theme.split(/\s+—\s+|\s+-\s+|:\s+/)
  if (parts.length >= 2) {
    return { title: parts[0].trim(), description: parts.slice(1).join(' — ').trim() }
  }
  return { title: theme, description: '' }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export default function PositioningBriefTab({
  accountId,
  latestBrief: initialBrief,
  contacts = [],
}: {
  accountId: string
  latestBrief: PositioningBrief | null
  contacts?: Contact[]
}) {
  // Build a name → { title, persona } lookup so persona messages can show
  // what role each person is in without requiring the agent to repeat it.
  const contactByName: Record<string, { title: string; persona_type: string }> = {}
  for (const c of contacts) {
    if (c.name) contactByName[c.name] = { title: c.title ?? '', persona_type: c.persona_type ?? '' }
  }
  const [brief, setBrief] = useState<PositioningBrief | null>(initialBrief)
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit-mode state — while editing, the UI renders editors instead of read-only
  // views. Cancel discards, Save PATCHes back and rehydrates brief.
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<BriefDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  const startEdit = () => {
    if (!brief) return
    setDraft(draftFromBrief(brief))
    setEditing(true)
    setError(null)
  }
  const cancelEdit = () => {
    setDraft(null)
    setEditing(false)
  }
  const saveEdit = async () => {
    if (!brief || !draft) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/briefs/${brief.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      setBrief(json.brief)
      setEditing(false)
      setDraft(null)
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 4500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function generateBrief() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/briefs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.details ?? json.error ?? 'Generation failed')
      setBrief(json.brief)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function toggleApproval() {
    if (!brief) return
    setApproving(true)
    try {
      const res = await fetch('/api/briefs/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefId: brief.id, approved: !brief.approved }),
      })
      const json = await res.json()
      if (res.ok) setBrief(json.brief)
    } finally {
      setApproving(false)
    }
  }

  if (!brief) {
    return (
      <div className="bg-white border rounded-xl p-12 text-center">
        <Sparkles className="w-10 h-10 mx-auto mb-4" style={{ color: '#008CB9' }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#00263E' }}>No positioning brief yet</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Generate an AI-powered positioning brief tailored to this account&apos;s vertical, geography, maturity level, and buying group.
        </p>
        <Button onClick={generateBrief} disabled={loading} className="text-white" style={{ backgroundColor: '#00263E' }}>
          {loading ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating with Claude…</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Generate Positioning Brief</>
          )}
        </Button>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>
    )
  }

  const personaMessages = brief.persona_messages as Record<string, string>
  const objectionHandlers = brief.objection_handlers as Array<{ objection: string; response: string }>

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5" style={{ color: '#008CB9' }} />
          <div>
            <span className="font-semibold text-sm" style={{ color: '#00263E' }}>AI Positioning Brief</span>
            <span className="text-xs text-gray-400 ml-2">Generated {new Date(brief.generated_at).toLocaleDateString()}</span>
          </div>
          {brief.approved ? (
            <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Approved
            </span>
          ) : (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
              Draft
            </span>
          )}
          <span className="text-xs bg-gray-50 text-gray-600 border px-2.5 py-1 rounded-full">
            Tone: {brief.recommended_tone}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveEdit}
                disabled={saving}
                style={{ backgroundColor: '#00263E', color: 'white' }}
                title="Saving updates this brief for everyone on your team working on this account — keeps the team aligned."
              >
                {saving
                  ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving for everyone…</>
                  : <><Save className="w-3.5 h-3.5 mr-1.5" /> Save for everyone</>}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={generateBrief} disabled={loading}>
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span className="ml-1.5">{loading ? 'Generating…' : 'Regenerate'}</span>
              </Button>
              <Button
                size="sm"
                onClick={toggleApproval}
                disabled={approving}
                variant={brief.approved ? 'outline' : 'default'}
                style={brief.approved ? {} : { backgroundColor: '#00263E', color: 'white' }}
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                {brief.approved ? 'Revoke Approval' : 'Approve Brief'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Alignment banner — appears while editing, explains the save semantics */}
      {editing && (
        <div
          className="rounded-lg px-4 py-3 flex items-start gap-3 text-sm"
          style={{ backgroundColor: '#E8F5F9', border: '1px solid #B6DCE1', color: '#00263E' }}
        >
          <Users className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#008CB9' }} />
          <div>
            <div className="font-semibold mb-0.5">Everyone sees the same brief.</div>
            <div className="text-xs leading-relaxed text-gray-700">
              Your edits replace this brief for every teammate looking at this account. The
              goal is alignment — next time a colleague opens Mission Control or this account&apos;s
              Brief tab, they see exactly what you wrote. Approval status is not affected.
            </div>
          </div>
        </div>
      )}

      {/* Saved toast */}
      {savedToast && (
        <div
          className="rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm"
          style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534' }}
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>Brief saved. Your edits are now live for everyone on your team.</span>
        </div>
      )}

      {/* Positioning Statement — editable */}
      {editing && draft && (
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: '#00263E' }}>Positioning Statement</h3>
              <p className="text-xs text-gray-500 mt-0.5">April Dunford 5-field format</p>
            </div>
          </div>
          <PositioningStatementEditor
            value={draft.positioning_statement}
            onChange={next => setDraft({ ...draft, positioning_statement: next })}
          />
        </div>
      )}

      {/* Positioning Statement (April Dunford format) */}
      {!editing && brief.positioning_statement && (
        <div className="rounded-xl p-7" style={{ backgroundColor: '#00263E' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-bold tracking-[0.2em]" style={{ color: '#F2EEA1' }}>POSITIONING STATEMENT</div>
              <div className="text-[10px] text-white/40">April Dunford format</div>
            </div>
            <CopyButton text={`For ${lcFirst(brief.positioning_statement.for)}, Tulip is ${lcFirst(brief.positioning_statement.category)} that ${lcFirst(brief.positioning_statement.key_benefit)}, unlike ${lcFirst(brief.positioning_statement.unlike)}, because ${lcFirst(brief.positioning_statement.because)}.`} />
          </div>

          {/* As a sentence */}
          <p className="text-white leading-relaxed text-[16px] mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 400 }}>
            <span className="font-bold" style={{ color: '#F2EEA1' }}>For</span> {lcFirst(brief.positioning_statement.for)},{' '}
            <span className="font-bold text-white">Tulip is</span> {lcFirst(brief.positioning_statement.category)}{' '}
            <span className="font-bold" style={{ color: '#F2EEA1' }}>that</span> {lcFirst(brief.positioning_statement.key_benefit)},{' '}
            <span className="font-bold" style={{ color: '#F2EEA1' }}>unlike</span> {lcFirst(brief.positioning_statement.unlike)},{' '}
            <span className="font-bold" style={{ color: '#F2EEA1' }}>because</span> {lcFirst(brief.positioning_statement.because)}.
          </p>

          {/* Scannable table view */}
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <table className="w-full text-[13px]">
              <tbody>
                {[
                  { label: 'FOR', value: brief.positioning_statement.for, hint: 'Target customer' },
                  { label: 'CATEGORY', value: brief.positioning_statement.category, hint: 'What Tulip is' },
                  { label: 'BENEFIT', value: brief.positioning_statement.key_benefit, hint: 'The outcome' },
                  { label: 'UNLIKE', value: brief.positioning_statement.unlike, hint: 'Main alternative' },
                  { label: 'BECAUSE', value: brief.positioning_statement.because, hint: 'Our unfair advantage' },
                ].map((row, i, arr) => (
                  <tr key={row.label} style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                    <td className="align-top py-3.5 px-4 w-36 whitespace-nowrap">
                      <div className="text-[11px] font-bold tracking-[0.12em]" style={{ color: '#F2EEA1' }}>{row.label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{row.hint}</div>
                    </td>
                    <td className="py-3.5 px-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.95)' }}>{lcFirst(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Strategic Narrative — INTERNAL, for the AE */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm" style={{ color: '#00263E' }}>Strategic Narrative</h3>
              <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: '#00263E', color: '#F2EEA1' }}>
                INTERNAL
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">For the AE. Never sent to the customer.</p>
          </div>
          {!editing && <CopyButton text={brief.core_message} />}
        </div>
        {editing && draft ? (
          <StrategicNarrativeEditor
            value={draft.core_message}
            onChange={next => setDraft({ ...draft, core_message: next })}
          />
        ) : (
          <StrategicNarrativeBullets core_message={brief.core_message} />
        )}
      </div>

      {/* Strategic Pillars — editable */}
      {editing && draft && (
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: '#00263E' }}>Strategic Pillars</h3>
              <p className="text-xs text-gray-500 mt-0.5">Title + short explanation per pillar</p>
            </div>
          </div>
          <KeyThemesEditor
            value={draft.key_themes}
            onChange={next => setDraft({ ...draft, key_themes: next })}
          />
        </div>
      )}

      {/* Strategic Pillars — with explanations */}
      {!editing && brief.key_themes?.length > 0 && (
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: '#00263E' }}>Strategic Pillars</h3>
              <p className="text-xs text-gray-500 mt-0.5">Anchor every conversation on these three</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(brief.key_themes as string[]).map((theme, i) => {
              const { title, description } = splitTheme(theme)
              return (
                <div key={i} className="rounded-lg p-4 border" style={{ backgroundColor: '#F8FBFD', borderColor: '#D0DBE6' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: '#00263E' }}>
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-bold leading-tight" style={{ color: '#00263E' }}>
                      {title}
                    </span>
                  </div>
                  {description ? (
                    <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Regenerate the brief for detailed pillar descriptions.</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Persona messages — editable */}
      {editing && draft && (
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: '#00263E' }}>Per-Persona Messages</h3>
              <p className="text-xs text-gray-500 mt-0.5">One message per persona (e.g. VP Quality, Head of Ops)</p>
            </div>
          </div>
          <PersonaMessagesEditor
            value={draft.persona_messages}
            onChange={next => setDraft({ ...draft, persona_messages: next })}
          />
        </div>
      )}

      {/* Persona messages — read-only */}
      {!editing && Object.keys(personaMessages).length > 0 && (
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm" style={{ color: '#00263E' }}>Per-Persona Messages</h3>
                <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: '#008CB9', color: 'white' }}>
                  CUSTOMER-FACING
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Draft outreach copy — personalize before sending.</p>
            </div>
          </div>
          <div className="space-y-3">
            {Object.entries(personaMessages).map(([persona, message]) => {
              const contactInfo = contactByName[persona]
              return (
                <div key={persona} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#00263E' }}>
                    {persona.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Name + persona_type chip on one row */}
                    <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold" style={{ color: '#00263E' }}>{persona}</span>
                      {contactInfo?.persona_type && (
                        <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: '#008CB9', color: 'white' }}>
                          {contactInfo.persona_type}
                        </span>
                      )}
                    </div>
                    {/* Title — what this person actually does */}
                    {contactInfo?.title && (
                      <div className="text-[11px] text-gray-500 mb-1.5 leading-snug">{contactInfo.title}</div>
                    )}
                    {/* Message body */}
                    <p className="text-sm text-gray-800 leading-relaxed">{message}</p>
                  </div>
                  <CopyButton text={message} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Proof points — editable */}
      {editing && draft && (
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#00263E' }}>Recommended Proof Points</h3>
          <StringListEditor
            value={draft.proof_points}
            onChange={next => setDraft({ ...draft, proof_points: next })}
            placeholder="e.g. A global pharma manufacturer cut batch review from days to hours."
            addLabel="+ Add proof point"
          />
        </div>
      )}

      {/* Proof points — read-only */}
      {!editing && brief.proof_points?.length > 0 && (
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#00263E' }}>Recommended Proof Points</h3>
          <div className="space-y-2">
            {(brief.proof_points as string[]).map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5" style={{ backgroundColor: '#008CB9' }}>
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objection handlers — editable */}
      {editing && draft && (
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#00263E' }}>Objection Handlers</h3>
          <ObjectionHandlersEditor
            value={draft.objection_handlers}
            onChange={next => setDraft({ ...draft, objection_handlers: next })}
          />
        </div>
      )}

      {/* Tone — editable select shown inline in edit mode */}
      {editing && draft && (
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-sm mb-3" style={{ color: '#00263E' }}>Recommended Tone</h3>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map(tone => (
              <button
                key={tone}
                type="button"
                onClick={() => setDraft({ ...draft, recommended_tone: tone })}
                className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  backgroundColor: draft.recommended_tone === tone ? '#00263E' : 'white',
                  color: draft.recommended_tone === tone ? '#F2EEA1' : 'var(--tulip-gray)',
                  borderColor: draft.recommended_tone === tone ? '#00263E' : 'var(--tulip-border)',
                }}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Objection handlers — read-only */}
      {!editing && objectionHandlers?.length > 0 && (
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#00263E' }}>Objection Handlers</h3>
          <div className="space-y-4">
            {objectionHandlers.map((item, i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
                  ⚠ {item.objection}
                </div>
                <div className="px-4 py-3 text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                  <span className="shrink-0 text-green-600 font-medium">→</span>
                  <span>{item.response}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Strategic Narrative — splits the 2-sentence core_message into "Why now"
// and "The play", then bullets each. Keeps the original prose on clipboard
// via the parent's CopyButton so the AE can still paste the raw copy.
// ─────────────────────────────────────────────────────────────────────────
function StrategicNarrativeBullets({ core_message }: { core_message: string }) {
  const { whyNow, play } = parseStrategicNarrative(core_message)

  if (whyNow.length === 0 && play.length === 0) {
    // Fall back to original paragraph render if parse fails
    return (
      <p className="text-gray-800 leading-relaxed text-[14px] border-l-2 pl-4" style={{ borderColor: '#008CB9' }}>
        {core_message}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {whyNow.length > 0 && (
        <div>
          <div className="text-[10px] font-bold tracking-[0.12em] mb-2" style={{ color: '#008CB9' }}>WHY NOW</div>
          <ul className="space-y-1.5" role="list">
            {whyNow.map((b, i) => (
              <li key={i} className="text-[13px] text-gray-700 leading-snug flex items-start gap-2">
                <span className="mt-2 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#008CB9' }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {play.length > 0 && (
        <div>
          <div className="text-[10px] font-bold tracking-[0.12em] mb-2" style={{ color: '#00263E' }}>THE PLAY</div>
          <ol className="space-y-1.5 list-none">
            {play.map((b, i) => (
              <li key={i} className="text-[13px] text-gray-700 leading-snug flex items-start gap-2">
                <span className="mt-0.5 w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: '#00263E', color: '#F2EEA1' }}>{i + 1}</span>
                <span>{b}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function parseStrategicNarrative(text: string): { whyNow: string[]; play: string[] } {
  if (!text) return { whyNow: [], play: [] }

  // Normalize literal "\n" (2-char) and "\r\n" that LLMs sometimes emit when the tool_use
  // JSON is double-escaped. Also collapse CRLF into LF.
  const normalized = text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')

  const structured = parseStructuredBullets(normalized)
  if (structured.whyNow.length > 0 || structured.play.length > 0) return structured

  return parseLegacyProse(normalized)
}

function parseStructuredBullets(text: string): { whyNow: string[]; play: string[] } {
  const whyNowIdx = text.search(/(?:^|\n)\s*WHY\s*NOW\s*:/i)
  const playIdx = text.search(/(?:^|\n)\s*THE\s*PLAY\s*:/i)
  if (whyNowIdx < 0 && playIdx < 0) return { whyNow: [], play: [] }

  const whyNowSection =
    whyNowIdx >= 0
      ? text.slice(whyNowIdx).replace(/^[\s\S]*?WHY\s*NOW\s*:\s*/i, '').split(/(?:^|\n)\s*THE\s*PLAY\s*:/i)[0] ?? ''
      : ''
  const playSection =
    playIdx >= 0
      ? text.slice(playIdx).replace(/^[\s\S]*?THE\s*PLAY\s*:\s*/i, '')
      : ''

  const extractBullets = (section: string, max: number): string[] => {
    if (!section) return []
    const lines = section.split(/\n+/)
    const bullets: string[] = []
    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue
      const m = line.match(/^[-•*]\s*(.+?)[\s.]*$/)
      if (m) bullets.push(m[1].trim())
    }
    return bullets.filter(b => b.length > 4).slice(0, max)
  }

  return {
    whyNow: extractBullets(whyNowSection, 4),
    play: extractBullets(playSection, 5),
  }
}

function parseLegacyProse(text: string): { whyNow: string[]; play: string[] } {
  const playIdx = text.search(/\bThe play:?\b/i)
  let whyNowText = text
  let playText = ''
  if (playIdx > 0) {
    whyNowText = text.slice(0, playIdx).trim().replace(/[—,.]\s*$/, '')
    playText = text.slice(playIdx).replace(/^The play:?\s*/i, '').trim()
  } else {
    const periodIdx = text.indexOf('. ')
    if (periodIdx > 0) {
      whyNowText = text.slice(0, periodIdx + 1).trim()
      playText = text.slice(periodIdx + 1).trim()
    }
  }

  // Legacy path splits on sentence boundaries only — fragment-on-em-dash was too aggressive.
  const toBullets = (s: string, max: number): string[] => {
    if (!s) return []
    return s
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"])/)
      .map(x => x.trim().replace(/^[—,.\s-]+/, '').replace(/[.]$/, ''))
      .filter(x => x.length > 12 && x.length < 260)
      .slice(0, max)
  }

  return {
    whyNow: toBullets(whyNowText, 4),
    play: toBullets(playText, 5),
  }
}
