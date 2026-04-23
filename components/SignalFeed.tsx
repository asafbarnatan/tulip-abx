'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Signal, SignalType, SignalSentiment } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, Newspaper, BarChart2, Building, Activity, Plus, X, Trash2, Sparkles, Cloud, Database, Loader2 } from 'lucide-react'

const SIGNAL_ICONS: Record<SignalType, React.ReactNode> = {
  intent:         <TrendingUp className="w-4 h-4" />,
  engagement:     <Activity className="w-4 h-4" />,
  news:           <Newspaper className="w-4 h-4" />,
  firmographic:   <Building className="w-4 h-4" />,
  product_usage:  <BarChart2 className="w-4 h-4" />,
}

const SIGNAL_COLORS: Record<SignalType, string> = {
  intent:        'bg-blue-100 text-blue-700',
  engagement:    'bg-teal-100 text-teal-700',
  news:          'bg-purple-100 text-purple-700',
  firmographic:  'bg-amber-100 text-amber-700',
  product_usage: 'bg-green-100 text-green-700',
}

const SENTIMENT_DOT: Record<SignalSentiment, string> = {
  positive: 'bg-green-400',
  neutral:  'bg-gray-400',
  negative: 'bg-red-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function SignalFeed({
  accountId,
  initialSignals,
}: {
  accountId: string
  initialSignals: Signal[]
}) {
  const router = useRouter()
  const [signals, setSignals] = useState<Signal[]>(initialSignals)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [integrationModal, setIntegrationModal] = useState<'salesforce' | 'zoominfo' | null>(null)
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentSteps, setAgentSteps] = useState<string[]>([])
  const [form, setForm] = useState({
    signal_type: 'intent' as SignalType,
    source: '',
    content: '',
    sentiment: 'positive' as SignalSentiment,
    source_url: '',
  })

  async function submitSignal() {
    if (!form.source.trim() || !form.content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, ...form, source_url: form.source_url.trim() || null }),
      })
      const json = await res.json()
      if (res.ok) {
        setSignals(prev => [json.signal, ...prev])
        setShowForm(false)
        setForm({ signal_type: 'intent', source: '', content: '', sentiment: 'positive', source_url: '' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteSignal(id: string) {
    if (!confirm('Delete this signal? This cannot be undone.')) return
    const prev = signals
    setSignals(prev.filter(s => s.id !== id))
    const res = await fetch(`/api/signals/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setSignals(prev) // revert
      alert('Delete failed — the signal has been restored in the list.')
    }
  }

  async function runSignalAgent() {
    setAgentRunning(true)
    setAgentSteps([])
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, pipeline: 'intelligence', trigger_source: 'signal-tab' }),
      })
      if (!res.ok || !res.body) {
        setAgentRunning(false)
        alert('Agent run failed to start.')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      // Parse the SSE stream — each "data: {json}\n\n" is one event
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let idx = 0
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 2)
          if (!chunk.startsWith('data:')) continue
          try {
            const evt = JSON.parse(chunk.slice(5).trim())
            if (evt.message) setAgentSteps(prev => [...prev, evt.message])
          } catch { /* ignore non-JSON pings */ }
        }
      }
      // Refresh to pull any new signals the agent synthesized
      router.refresh()
      // Also refresh our local list by re-fetching
      const sigRes = await fetch(`/api/signals?accountId=${accountId}`)
      if (sigRes.ok) {
        const d = await sigRes.json()
        if (Array.isArray(d.signals)) setSignals(d.signals)
      }
    } finally {
      setAgentRunning(false)
      // keep step log briefly so the user sees the completion line
      setTimeout(() => setAgentSteps([]), 4000)
    }
  }

  const unprocessed = signals.filter(s => !s.processed)
  const processed = signals.filter(s => s.processed)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold" style={{ color: '#00263E' }}>{signals.length} signals</h3>
          {unprocessed.length > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-0.5">{unprocessed.length} unreviewed — consider regenerating the positioning brief</p>
          )}
        </div>
        <Button size="sm" onClick={() => setShowForm(v => !v)} variant="outline">
          {showForm ? <><X className="w-3.5 h-3.5 mr-1.5" />Cancel</> : <><Plus className="w-3.5 h-3.5 mr-1.5" />Add Signal</>}
        </Button>
      </div>

      {/* Integration / sourcing toolbar — same pattern as Buying Group empty slots */}
      <div className="bg-white border rounded-xl p-4" style={{ borderStyle: 'dashed', borderColor: '#D0DBE6', borderWidth: 2 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <div className="text-sm font-semibold" style={{ color: '#00263E' }}>Get more signals</div>
            <p className="text-xs text-gray-500">Run the signal agent, pull from a CRM, or add a source manually.</p>
          </div>
          {agentRunning && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Agent running…
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={runSignalAgent}
            disabled={agentRunning}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#00263E', color: '#F2EEA1', borderColor: '#00263E' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Research via Agent
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add manually
          </button>
          <button
            onClick={() => setIntegrationModal('salesforce')}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50"
          >
            <Cloud className="w-3.5 h-3.5" />
            From Salesforce
          </button>
          <button
            onClick={() => setIntegrationModal('zoominfo')}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50"
          >
            <Database className="w-3.5 h-3.5" />
            From ZoomInfo
          </button>
        </div>
        {agentSteps.length > 0 && (
          <div className="mt-3 border-t pt-2 max-h-32 overflow-y-auto">
            {agentSteps.slice(-6).map((s, i) => (
              <div key={i} className="text-[11px] text-gray-500 leading-snug">· {s}</div>
            ))}
          </div>
        )}
      </div>

      {/* Add signal form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-sm" style={{ color: '#00263E' }}>Log a new signal</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Signal type</label>
              <Select value={form.signal_type} onValueChange={v => setForm(f => ({ ...f, signal_type: v as SignalType }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intent">Intent</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="firmographic">Firmographic</SelectItem>
                  <SelectItem value="product_usage">Product Usage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sentiment</label>
              <Select value={form.sentiment} onValueChange={v => setForm(f => ({ ...f, sentiment: v as SignalSentiment }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Source</label>
            <input
              className="w-full border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
              placeholder="e.g. FDA press release, MedTech Dive, CS call notes…"
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Source URL (optional, public)</label>
            <input
              className="w-full border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
              placeholder="https://…"
              value={form.source_url}
              onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Signal description</label>
            <Textarea
              rows={3}
              placeholder="Describe what was observed…"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="text-sm resize-none"
            />
          </div>
          <Button
            onClick={submitSignal}
            disabled={submitting || !form.source.trim() || !form.content.trim()}
            className="text-white w-full"
            style={{ backgroundColor: '#00263E' }}
          >
            {submitting ? 'Logging…' : 'Log Signal'}
          </Button>
        </div>
      )}

      {/* Unprocessed signals */}
      {unprocessed.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            New — awaiting review
          </div>
          <div className="space-y-2">
            {unprocessed.map(signal => <SignalCard key={signal.id} signal={signal} onDelete={deleteSignal} />)}
          </div>
        </div>
      )}

      {/* Processed signals */}
      {processed.length > 0 && (
        <div>
          {unprocessed.length > 0 && (
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">Reviewed</div>
          )}
          <div className="space-y-2">
            {processed.map(signal => <SignalCard key={signal.id} signal={signal} onDelete={deleteSignal} />)}
          </div>
        </div>
      )}

      {signals.length === 0 && !showForm && (
        <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
          <p className="font-medium">No signals logged yet.</p>
          <p className="text-sm mt-1">Use the toolbar above to source the first signal.</p>
        </div>
      )}

      {integrationModal && (
        <IntegrationModal provider={integrationModal} onClose={() => setIntegrationModal(null)} />
      )}
    </div>
  )
}

function SignalCard({ signal, onDelete }: { signal: Signal; onDelete: (id: string) => void }) {
  const color = SIGNAL_COLORS[signal.signal_type] ?? 'bg-gray-100 text-gray-600'
  const icon = SIGNAL_ICONS[signal.signal_type]
  const dot = SENTIMENT_DOT[signal.sentiment]

  const sourceMatch = signal.content.match(/\[Source:\s*(https?:\/\/[^\s\]]+)\]/)
  const sourceUrl = signal.source_url ?? (sourceMatch ? sourceMatch[1] : null)
  const cleanContent = sourceMatch ? signal.content.replace(/\n\n\[Source:[^\]]+\]/, '') : signal.content

  const { headline, bullets } = parseSignalContent(cleanContent)

  return (
    <div className="bg-white border rounded-lg p-4 flex items-start gap-3 group">
      <div className={`p-1.5 rounded-lg ${color} shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-xs font-semibold uppercase tracking-wide ${color.split(' ')[1]}`}>
            {signal.signal_type.replace('_', ' ')}
          </span>
          <span className="text-xs text-gray-400">via {signal.source}</span>
          <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} title={signal.sentiment} />
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1"
              style={{ backgroundColor: '#e8f5f9', color: '#0077a8' }}
              title="View public source"
            >
              ↗ Source
            </a>
          )}
        </div>
        <p className="text-[13px] font-semibold text-gray-900 leading-snug">{headline}</p>
        {bullets.length > 0 && (
          <ul className="mt-1.5 space-y-1" role="list">
            {bullets.map((b, i) => (
              <li key={i} className="text-xs text-gray-600 leading-snug flex items-start gap-1.5">
                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#008CB9' }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-xs text-gray-400">{timeAgo(signal.created_at)}</span>
        <button
          onClick={() => onDelete(signal.id)}
          aria-label="Delete signal"
          title="Delete signal"
          className="text-gray-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function parseSignalContent(raw: string): { headline: string; bullets: string[] } {
  const text = raw.trim()
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
  const headline = sentences[0] ?? text
  const rest = sentences.slice(1).join(' ').trim()
  if (!rest) return { headline, bullets: [] }

  const rawBullets = rest
    .split(/\s+—\s+|(?<=[.!?])\s+/)
    .map(s => s.trim().replace(/^[—\-\s]+/, '').replace(/[.]$/, ''))
    .filter(s => s.length > 3 && s.length < 160)
    .slice(0, 3)

  return { headline, bullets: rawBullets }
}

// ───────────────────────────────────────────────────────────────────────
// Integration Modal — Salesforce / ZoomInfo (architectural stub, mirrors BuyingGroupTab)
// ───────────────────────────────────────────────────────────────────────
function IntegrationModal({
  provider, onClose,
}: {
  provider: 'salesforce' | 'zoominfo'
  onClose: () => void
}) {
  const router = useRouter()
  const name = provider === 'salesforce' ? 'Salesforce' : 'ZoomInfo'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 10, padding: 24, maxWidth: 500, width: '100%' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#00263E' }}>Import signals from {name}</h2>
            <p className="text-xs text-gray-500 mt-1">Not connected yet.</p>
          </div>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-700 leading-none">×</button>
        </div>
        <div className="text-sm text-gray-700 leading-relaxed mb-4">
          {provider === 'salesforce' && (
            <>When connected, Tulip ABX reads the Opportunity stage, MSA status, open Tasks, and Activity History from the linked Salesforce Account — and surfaces them as engagement signals. Also pulls recent Case escalations and Contract renewal dates.</>
          )}
          {provider === 'zoominfo' && (
            <>When connected, ZoomInfo streams firmographic changes and intent topics for this company — new hires in the buying group, funding events, technology adoption, and surges on topics relevant to Tulip. All new events appear here as tagged signals.</>
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
