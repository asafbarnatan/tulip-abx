'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Contact } from '@/lib/database.types'
import { Card, CardContent } from '@/components/ui/card'
import { Link2, Tag, ExternalLink, Sparkles, UserPlus, Database, Cloud, Pencil, Trash2, Mail, Phone } from 'lucide-react'

const PERSONA_CONFIG: Record<string, { color: string; description: string }> = {
  'Champion':           { color: 'bg-green-100 text-green-800',  description: 'Internal advocate — drives internal buy-in' },
  'Economic Buyer':     { color: 'bg-blue-100 text-blue-800',    description: 'Controls budget and final sign-off' },
  'Technical Evaluator':{ color: 'bg-purple-100 text-purple-800',description: 'Evaluates technical fit and integration' },
  'End User':           { color: 'bg-gray-100 text-gray-700',    description: 'Frontline operator or team using the platform' },
  'Blocker':            { color: 'bg-red-100 text-red-800',      description: 'Creates friction — needs to be addressed' },
}

const AVATAR_COLORS = ['#00263E', '#008CB9', '#7c3aed', '#059669', '#d97706']

// Roles that every Tier-1 enterprise buying group ideally has filled
const EXPECTED_ROLES: Array<{ persona_type: string; suggested_title: string }> = [
  { persona_type: 'Economic Buyer',       suggested_title: 'VP / SVP Operations, Quality, or Manufacturing' },
  { persona_type: 'Champion',             suggested_title: 'Head of Digital Transformation / Smart Manufacturing' },
  { persona_type: 'Technical Evaluator',  suggested_title: 'IT Director, Quality Systems Lead, or CISO' },
  { persona_type: 'End User',             suggested_title: 'Plant Manager, Production Supervisor, Line Lead' },
]

interface Props {
  contacts: Contact[]
  accountId?: string
  accountName?: string
}

export default function BuyingGroupTab({ contacts, accountId, accountName }: Props) {
  const router = useRouter()
  const [researchTarget, setResearchTarget] = useState<{ role: string; persona_type: string } | null>(null)
  const [manualTarget, setManualTarget] = useState<{ persona_type: string } | null>(null)
  const [integrationModal, setIntegrationModal] = useState<{ provider: 'salesforce' | 'zoominfo'; persona_type: string } | null>(null)
  const [editTarget, setEditTarget] = useState<Contact | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deleteContact = async (id: string) => {
    if (!confirm('Delete this contact? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  const champions = contacts.filter(c => c.persona_type === 'Champion')
  const economicBuyers = contacts.filter(c => c.persona_type === 'Economic Buyer')
  const technicals = contacts.filter(c => c.persona_type === 'Technical Evaluator')
  const blockers = contacts.filter(c => c.persona_type === 'Blocker')
  const endUsers = contacts.filter(c => c.persona_type === 'End User')

  // Identify which expected roles have ZERO real contacts
  const filledPersonaTypes = new Set<string>(contacts.map(c => c.persona_type))
  const unfilledRoles = EXPECTED_ROLES.filter(r => !filledPersonaTypes.has(r.persona_type))

  return (
    <div className="space-y-4">
      {/* Data integrity banner */}
      <div className="rounded-lg px-4 py-2.5 flex items-start gap-2" style={{ backgroundColor: '#e8f5f9', borderLeft: '3px solid #008CB9' }}>
        <Sparkles className="w-4 h-4 mt-0.5" style={{ color: '#008CB9' }} />
        <div>
          <div className="text-xs font-semibold" style={{ color: '#00263E' }}>Zero-fabrication buying group</div>
          <div className="text-xs text-gray-600 mt-0.5">
            Every contact below is a real, publicly-verifiable executive — click the source link on any card to view their public profile.
            Unfilled roles show 4 ways to source a real person: Agent Research, Salesforce, ZoomInfo, or manual entry.
          </div>
        </div>
      </div>

      {/* Influence map */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-semibold mb-1" style={{ color: '#00263E' }}>Buying Group Map</h3>
        <p className="text-sm text-gray-500 mb-5">
          {contacts.length} verified stakeholder{contacts.length !== 1 ? 's' : ''}: {economicBuyers.length} economic buyer{economicBuyers.length !== 1 ? 's' : ''}, {champions.length} champion{champions.length !== 1 ? 's' : ''}, {technicals.length} technical evaluator{technicals.length !== 1 ? 's' : ''}, {endUsers.length} end user{endUsers.length !== 1 ? 's' : ''}{blockers.length > 0 ? `, ${blockers.length} blocker${blockers.length > 1 ? 's' : ''}` : ''}
        </p>

        {contacts.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            {economicBuyers.length > 0 && (
              <div className="flex flex-col items-center">
                <div className="flex items-start gap-8 justify-center">
                  {economicBuyers.map((c, i) => <PersonaNode key={c.id} contact={c} index={i} size="lg" />)}
                </div>
                <div className="w-px h-6 bg-gray-200 mt-2" />
              </div>
            )}
            <div className="flex items-start gap-8 justify-center flex-wrap">
              {champions.map((c, i) => <PersonaNode key={c.id} contact={c} index={i + economicBuyers.length} size="md" />)}
              {technicals.map((c, i) => <PersonaNode key={c.id} contact={c} index={i + economicBuyers.length + champions.length} size="md" />)}
            </div>
            {(blockers.length > 0 || endUsers.length > 0) && (
              <div className="flex items-start gap-8 justify-center flex-wrap">
                {blockers.map((c, i) => <PersonaNode key={c.id} contact={c} index={i + economicBuyers.length + champions.length + technicals.length} size="sm" />)}
                {endUsers.map((c, i) => <PersonaNode key={c.id} contact={c} index={i + economicBuyers.length + champions.length + technicals.length + blockers.length} size="sm" />)}
              </div>
            )}
          </div>
        )}

        {contacts.length === 0 && (
          <div className="text-center text-gray-400 py-6 text-sm">No contacts verified yet. Use the empty slots below to source real people.</div>
        )}
      </div>

      {/* Verified contact cards */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact, i) => {
            const persona = PERSONA_CONFIG[contact.persona_type]
            const sourceUrl = contact.source_url
              || (contact.linkedin_url && contact.linkedin_url.startsWith('http') ? contact.linkedin_url : null)
            // A LinkedIn URL that's actually a LinkedIn URL (not just source) should be exposed separately.
            const linkedinDisplay = contact.linkedin_url && contact.linkedin_url.includes('linkedin.com') ? contact.linkedin_url : null
            return (
              <Card key={contact.id} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                        style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                      >
                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{contact.name}</div>
                        <div className="text-xs text-gray-500">{contact.title}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${persona?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {contact.persona_type}
                      </span>
                      <button
                        onClick={() => setEditTarget(contact)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        aria-label="Edit contact"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        disabled={deletingId === contact.id}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                        aria-label="Delete contact"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Email / phone / LinkedIn contact row */}
                  {(contact.email || contact.phone || linkedinDisplay) && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-xs">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                          <Mail className="w-3 h-3" /> {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                          <Phone className="w-3 h-3" /> {contact.phone}
                        </a>
                      )}
                      {linkedinDisplay && (
                        <a
                          href={linkedinDisplay.startsWith('http') ? linkedinDisplay : `https://${linkedinDisplay}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                        >
                          <Link2 className="w-3 h-3" /> LinkedIn
                        </a>
                      )}
                    </div>
                  )}

                  {contact.inferred_pain_points?.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
                        <Tag className="w-3 h-3" />
                        Public pain signals
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {contact.inferred_pain_points.map((pain, j) => (
                          <span key={j} className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                            {pain}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{contact.preferred_channel ? `Prefers: ${contact.preferred_channel}` : 'Channel: unknown'}</span>
                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium"
                        style={{ color: '#008CB9' }}
                        onClick={e => e.stopPropagation()}
                        title="View public source"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Source
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* EMPTY SLOTS — the magic section. 4 options per unfilled role. */}
      {unfilledRoles.length > 0 && (
        <div className="bg-white border rounded-xl p-6" style={{ borderStyle: 'dashed', borderColor: '#D0DBE6', borderWidth: 2 }}>
          <h3 className="font-semibold mb-1" style={{ color: '#00263E' }}>Unfilled buying group roles</h3>
          <p className="text-sm text-gray-500 mb-4">
            {unfilledRoles.length} role{unfilledRoles.length > 1 ? 's' : ''} not yet mapped. Pick how to source a real person — no synthetic personas allowed.
          </p>
          <div className="space-y-3">
            {unfilledRoles.map(role => (
              <div key={role.persona_type} className="border rounded-lg p-4" style={{ backgroundColor: '#F8FBFD' }}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#00263E' }}>{role.persona_type}</div>
                    <div className="text-xs text-gray-500">Suggested: {role.suggested_title}</div>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-500">EMPTY SLOT</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => setResearchTarget({ role: role.suggested_title, persona_type: role.persona_type })}
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border transition-colors"
                    style={{ backgroundColor: '#00263E', color: '#F2EEA1', borderColor: '#00263E' }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Research via Agent
                  </button>
                  <button
                    onClick={() => setManualTarget({ persona_type: role.persona_type })}
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add manually
                  </button>
                  <button
                    onClick={() => setIntegrationModal({ provider: 'salesforce', persona_type: role.persona_type })}
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    From Salesforce
                  </button>
                  <button
                    onClick={() => setIntegrationModal({ provider: 'zoominfo', persona_type: role.persona_type })}
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <Database className="w-3.5 h-3.5" />
                    From ZoomInfo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {researchTarget && accountId && accountName && (
        <AgentResearchModal
          accountId={accountId}
          accountName={accountName}
          role={researchTarget.role}
          personaType={researchTarget.persona_type}
          onClose={() => setResearchTarget(null)}
          onApproved={() => { setResearchTarget(null); router.refresh() }}
        />
      )}
      {manualTarget && accountId && (
        <ManualContactModal
          accountId={accountId}
          personaType={manualTarget.persona_type}
          onClose={() => setManualTarget(null)}
          onSaved={() => { setManualTarget(null); router.refresh() }}
        />
      )}
      {integrationModal && (
        <IntegrationModal
          provider={integrationModal.provider}
          personaType={integrationModal.persona_type}
          onClose={() => setIntegrationModal(null)}
        />
      )}
      {editTarget && (
        <EditContactModal
          contact={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); router.refresh() }}
        />
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Influence map node
// ───────────────────────────────────────────────────────────────────────
function PersonaNode({ contact, index, size }: { contact: Contact; index: number; size: 'lg' | 'md' | 'sm' }) {
  const colors = ['#00263E', '#008CB9', '#7c3aed', '#059669', '#d97706', '#dc2626']
  const sz = size === 'lg' ? 'w-14 h-14 text-base' : size === 'md' ? 'w-11 h-11 text-sm' : 'w-9 h-9 text-xs'
  const initials = contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)
  return (
    <div className="flex flex-col items-center gap-1 max-w-28">
      <div className={`${sz} rounded-full flex items-center justify-center text-white font-semibold shrink-0 ring-2 ring-white shadow-sm`}
        style={{ backgroundColor: colors[index % colors.length] }}>
        {initials}
      </div>
      <span className="text-xs text-center text-gray-700 font-medium leading-tight">{contact.name.split(' ')[0]} {contact.name.split(' ').slice(-1)[0]}</span>
      <span className="text-[10px] text-center text-gray-400 leading-tight">{contact.persona_type}</span>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Agent Research Modal — streams ContactResearchAgent steps + approval
// ───────────────────────────────────────────────────────────────────────
interface Candidate {
  name: string
  title: string
  persona_type: string
  source_url: string
  confidence: string
  inferred_pain_points: string[]
  evidence_quote: string
  reasoning: string
}

function AgentResearchModal({
  accountId, accountName, role, personaType, onClose, onApproved,
}: {
  accountId: string
  accountName: string
  role: string
  personaType: string
  onClose: () => void
  onApproved: () => void
}) {
  const [steps, setSteps] = useState<Array<{ step?: string; message?: string; type?: string }>>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [running, setRunning] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  const start = async () => {
    setStarted(true)
    setSteps([])
    setCandidates([])
    setRunning(true)
    const res = await fetch('/api/agents/contact-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, role, persona_type: personaType }),
    })
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    if (!reader) { setRunning(false); return }
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            setSteps(prev => [...prev, data])
            if (data.type === 'research_complete' && Array.isArray(data.candidates)) {
              setCandidates(data.candidates)
            }
          } catch { /* skip */ }
        }
      }
    }
    setRunning(false)
  }

  const approveCandidate = async (c: Candidate) => {
    setApproving(c.name)
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        name: c.name,
        title: c.title,
        persona_type: c.persona_type,
        source_url: c.source_url,
        inferred_pain_points: c.inferred_pain_points,
        preferred_channel: 'email',
      }),
    })
    setApproving(null)
    if (res.ok) onApproved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 10, padding: 24, maxWidth: 720, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#00263E' }}>🤖 Research {personaType} via Agent</h2>
            <p className="text-xs text-gray-500 mt-1">Account: {accountName} · Target role: {role}</p>
          </div>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-700 leading-none">×</button>
        </div>

        {!started && (
          <div className="space-y-3">
            <div className="rounded-lg p-3 text-xs text-gray-600 bg-gray-50 border leading-relaxed">
              The <strong>ContactResearchAgent</strong> will search the public web (press releases, leadership pages, major publications) to find a real person currently in a {personaType} role at {accountName}.
              It must provide a direct source URL and an evidence quote. You review and approve before anyone is added.
              <br /><br />
              <strong>Zero fabrication.</strong> If no publicly-verifiable person is found, the agent will say so instead of inventing one.
            </div>
            <button
              onClick={start}
              className="w-full font-bold text-sm px-4 py-2.5 rounded-md flex items-center justify-center gap-2"
              style={{ backgroundColor: '#00263E', color: '#F2EEA1' }}
            >
              <Sparkles className="w-4 h-4" />
              Start research
            </button>
          </div>
        )}

        {started && (
          <div>
            {/* Live steps */}
            <div className="rounded-lg p-3 bg-slate-900 mb-3 max-h-56 overflow-y-auto font-mono text-xs" style={{ color: '#94a3b8' }}>
              {steps.length === 0 && <div>Starting...</div>}
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <span className="text-slate-500">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-amber-300">{s.step ?? s.type}</span>
                  <span>{s.message}</span>
                </div>
              ))}
              {running && <div className="text-slate-400 animate-pulse mt-1">▌ agent is working...</div>}
            </div>

            {/* Candidates */}
            {candidates.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-gray-600">{candidates.length} candidate{candidates.length > 1 ? 's' : ''} found — review and approve</div>
                {candidates.map((c, i) => (
                  <div key={i} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: '#00263E' }}>{c.name}</div>
                        <div className="text-xs text-gray-600">{c.title}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.confidence === 'high' ? 'bg-green-100 text-green-800' : c.confidence === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                        {c.confidence?.toUpperCase()} CONFIDENCE
                      </span>
                    </div>
                    <div className="text-xs text-gray-700 italic border-l-2 pl-2 mb-2" style={{ borderColor: '#008CB9' }}>
                      &ldquo;{c.evidence_quote}&rdquo;
                    </div>
                    {c.reasoning && <div className="text-xs text-gray-500 mb-2">{c.reasoning}</div>}
                    {c.inferred_pain_points?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {c.inferred_pain_points.map((p, j) => (
                          <span key={j} className="text-[10px] bg-gray-50 text-gray-600 border px-2 py-0.5 rounded-full">{p}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1" style={{ color: '#008CB9' }}>
                        <ExternalLink className="w-3 h-3" /> Source
                      </a>
                      <button
                        onClick={() => approveCandidate(c)}
                        disabled={approving === c.name}
                        className="text-xs font-bold px-3 py-1.5 rounded"
                        style={{ backgroundColor: '#22c55e', color: 'white', opacity: approving === c.name ? 0.6 : 1 }}
                      >
                        {approving === c.name ? 'Adding...' : '✓ Approve + add'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!running && candidates.length === 0 && (
              <div className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded p-3">
                No publicly-verifiable candidate found. Try a different role description, add manually, or integrate Salesforce/ZoomInfo.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Manual Contact Modal
// ───────────────────────────────────────────────────────────────────────
function ManualContactModal({
  accountId, personaType, onClose, onSaved,
}: {
  accountId: string
  personaType: string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [painPointsText, setPainPointsText] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim() || !title.trim()) return
    setSaving(true)
    const painPoints = painPointsText.split('\n').map(p => p.trim()).filter(Boolean)
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        name,
        title,
        persona_type: personaType,
        email: email || null,
        phone: phone || null,
        linkedin_url: linkedinUrl || null,
        source_url: sourceUrl || linkedinUrl || null,
        inferred_pain_points: painPoints,
        preferred_channel: email ? 'email' : phone ? 'phone' : 'email',
      }),
    })
    setSaving(false)
    if (res.ok) onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 10, padding: 24, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#00263E' }}>Add {personaType} manually</h2>
            <p className="text-xs text-gray-500 mt-1">Only add real people. Include a source URL.</p>
          </div>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-700 leading-none">×</button>
        </div>
        <ContactFormFields
          name={name} setName={setName}
          title={title} setTitle={setTitle}
          email={email} setEmail={setEmail}
          phone={phone} setPhone={setPhone}
          linkedinUrl={linkedinUrl} setLinkedinUrl={setLinkedinUrl}
          sourceUrl={sourceUrl} setSourceUrl={setSourceUrl}
          painPointsText={painPointsText} setPainPointsText={setPainPointsText}
        />
        <div className="flex gap-2 pt-3">
          <button onClick={save} disabled={!name.trim() || !title.trim() || saving} className="text-sm font-bold px-4 py-2 rounded" style={{ backgroundColor: '#00263E', color: '#F2EEA1', opacity: saving || !name.trim() ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save contact'}
          </button>
          <button onClick={onClose} className="text-sm px-4 py-2 rounded border bg-white">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Edit Contact Modal — same fields as ManualContactModal but PATCHes
// ───────────────────────────────────────────────────────────────────────

function EditContactModal({
  contact, onClose, onSaved,
}: {
  contact: Contact
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(contact.name)
  const [title, setTitle] = useState(contact.title)
  const [email, setEmail] = useState(contact.email ?? '')
  const [phone, setPhone] = useState(contact.phone ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(contact.linkedin_url && contact.linkedin_url.includes('linkedin.com') ? contact.linkedin_url : '')
  const [sourceUrl, setSourceUrl] = useState(contact.source_url ?? '')
  const [painPointsText, setPainPointsText] = useState((contact.inferred_pain_points ?? []).join('\n'))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim() || !title.trim()) return
    setSaving(true)
    const painPoints = painPointsText.split('\n').map(p => p.trim()).filter(Boolean)
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, title,
        email: email || null,
        phone: phone || null,
        linkedin_url: linkedinUrl || null,
        source_url: sourceUrl || null,
        inferred_pain_points: painPoints,
      }),
    })
    setSaving(false)
    if (res.ok) onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 10, padding: 24, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#00263E' }}>Edit contact</h2>
            <p className="text-xs text-gray-500 mt-1">{contact.persona_type}</p>
          </div>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-700 leading-none">×</button>
        </div>
        <ContactFormFields
          name={name} setName={setName}
          title={title} setTitle={setTitle}
          email={email} setEmail={setEmail}
          phone={phone} setPhone={setPhone}
          linkedinUrl={linkedinUrl} setLinkedinUrl={setLinkedinUrl}
          sourceUrl={sourceUrl} setSourceUrl={setSourceUrl}
          painPointsText={painPointsText} setPainPointsText={setPainPointsText}
        />
        <div className="flex gap-2 pt-3">
          <button onClick={save} disabled={!name.trim() || !title.trim() || saving} className="text-sm font-bold px-4 py-2 rounded" style={{ backgroundColor: '#00263E', color: '#F2EEA1', opacity: saving || !name.trim() ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button onClick={onClose} className="text-sm px-4 py-2 rounded border bg-white">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// Shared form fields component
function ContactFormFields(props: {
  name: string; setName: (v: string) => void
  title: string; setTitle: (v: string) => void
  email: string; setEmail: (v: string) => void
  phone: string; setPhone: (v: string) => void
  linkedinUrl: string; setLinkedinUrl: (v: string) => void
  sourceUrl: string; setSourceUrl: (v: string) => void
  painPointsText: string; setPainPointsText: (v: string) => void
}) {
  const { name, setName, title, setTitle, email, setEmail, phone, setPhone, linkedinUrl, setLinkedinUrl, sourceUrl, setSourceUrl, painPointsText, setPainPointsText } = props
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-gray-600 font-semibold block mb-1">Full name *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="w-full text-sm px-3 py-2 border rounded outline-none" placeholder="Dr. Jane Smith" />
      </div>
      <div>
        <label className="text-xs text-gray-600 font-semibold block mb-1">Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full text-sm px-3 py-2 border rounded outline-none" placeholder="VP Quality & Compliance" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600 font-semibold block mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full text-sm px-3 py-2 border rounded outline-none" placeholder="jane.smith@company.com" />
        </div>
        <div>
          <label className="text-xs text-gray-600 font-semibold block mb-1">Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full text-sm px-3 py-2 border rounded outline-none" placeholder="+1 555 0123" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-600 font-semibold block mb-1">LinkedIn URL</label>
        <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className="w-full text-sm px-3 py-2 border rounded outline-none font-mono text-xs" placeholder="https://linkedin.com/in/..." />
      </div>
      <div>
        <label className="text-xs text-gray-600 font-semibold block mb-1">Source URL (public verification)</label>
        <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="w-full text-sm px-3 py-2 border rounded outline-none font-mono text-xs" placeholder="https://company.com/leadership/..." />
      </div>
      <div>
        <label className="text-xs text-gray-600 font-semibold block mb-1">Pain points (one per line)</label>
        <textarea value={painPointsText} onChange={e => setPainPointsText(e.target.value)} rows={3} className="w-full text-sm px-3 py-2 border rounded outline-none" placeholder="Paper-based batch records audit risk&#10;Cross-site quality consistency" />
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Integration Modal — Salesforce / ZoomInfo stub (architectural placeholder)
// ───────────────────────────────────────────────────────────────────────
function IntegrationModal({
  provider, personaType, onClose,
}: {
  provider: 'salesforce' | 'zoominfo'
  personaType: string
  onClose: () => void
}) {
  const router = useRouter()
  const name = provider === 'salesforce' ? 'Salesforce' : 'ZoomInfo'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 10, padding: 24, maxWidth: 500, width: '100%' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#00263E' }}>Import {personaType} from {name}</h2>
            <p className="text-xs text-gray-500 mt-1">Not connected yet.</p>
          </div>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-700 leading-none">×</button>
        </div>
        <div className="text-sm text-gray-700 leading-relaxed mb-4">
          {provider === 'salesforce' && (
            <>When connected, Tulip ABX pulls contacts directly from the linked Account record in Salesforce — Contacts, Roles (Economic Buyer / Champion / Technical Evaluator), Last Activity, and Owner mapping. No duplicate data entry.</>
          )}
          {provider === 'zoominfo' && (
            <>When connected, ZoomInfo returns the real-time org chart for this company — verified emails, direct dials, recent job changes, intent signals. Agent surfaces candidates matching the unfilled role.</>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { onClose(); router.push('/settings/integrations') }}
            className="text-sm font-bold px-4 py-2 rounded flex items-center gap-1.5"
            style={{ backgroundColor: '#00263E', color: '#F2EEA1' }}
          >
            Connect {name} →
          </button>
          <button onClick={onClose} className="text-sm px-4 py-2 rounded border bg-white">Cancel</button>
        </div>
      </div>
    </div>
  )
}
