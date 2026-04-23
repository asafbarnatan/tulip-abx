'use client'

import { useEffect, useRef, useState } from 'react'
import { agentColor, agentInitials, agentLabel } from '@/lib/agents/agent-metadata'

interface AgentStep {
  ts: string
  agent?: string
  step?: string
  message?: string
  type?: string
  pipeline?: string
  account_id?: string
}

interface AgentRun {
  id: string
  agent_name: string
  status: string
  input_summary: string
  output_summary: string
  started_at: string
  account_id?: string
  accounts?: { name: string }
}

// Renders agent output_summary gracefully: JSON arrays (e.g. SignalWatcher's ranked
// accounts) become a compact human-readable chip; JSON objects become a key/value
// summary; plain strings pass through untouched. Prevents raw JSON blobs from
// appearing on the demo screen when the stakeholder glances at "Recent Runs".
function formatOutputSummary(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return raw
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return 'No items ranked.'
      // SignalWatcher shape: [{ account_id, urgency: 'critical'|'high'|'medium'|'low', reason }]
      const hasUrgency = parsed.some(p => typeof p === 'object' && p && 'urgency' in p)
      if (hasUrgency) {
        const counts = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>
        for (const p of parsed) {
          const u = (p as { urgency?: string }).urgency
          if (u && u in counts) counts[u]++
        }
        const parts: string[] = []
        if (counts.critical) parts.push(`${counts.critical} critical`)
        if (counts.high) parts.push(`${counts.high} high`)
        if (counts.medium) parts.push(`${counts.medium} medium`)
        if (counts.low) parts.push(`${counts.low} low`)
        return `${parsed.length} accounts ranked · ${parts.join(', ') || 'baseline'}`
      }
      return `${parsed.length} item${parsed.length === 1 ? '' : 's'} processed.`
    }
    if (parsed && typeof parsed === 'object') {
      const keys = Object.keys(parsed as object).slice(0, 3)
      if (keys.length === 0) return 'Completed.'
      return keys.map(k => `${k}: ${truncate(String((parsed as Record<string, unknown>)[k]), 40)}`).join(' · ')
    }
  } catch {
    // Not valid JSON — fall through to raw passthrough (truncated).
  }
  return truncate(raw, 200)
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

// agentInitial is re-exported from @/lib/agents/agent-metadata as agentInitials.
const agentInitial = (agent?: string) => agentInitials(agent)

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  liveSteps: any[]
  isRunning: boolean
}

export function AgentActivityFeed({ liveSteps, isRunning }: Props) {
  const [history, setHistory] = useState<AgentRun[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/agents/runs?limit=20')
      .then(r => r.json())
      .then(d => setHistory(d.runs ?? []))
      .catch(() => null)
  }, [isRunning])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveSteps])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tulip-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Agent Activity
        {isRunning && (
          <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            LIVE
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {liveSteps.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {liveSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', backgroundColor: agentColor(step.agent),
                  color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {agentInitial(step.agent)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--tulip-gray)' }}>
                    <span style={{ color: agentColor(step.agent), fontWeight: 600 }}>{step.agent ? agentLabel(step.agent) : step.type}</span>
                    {step.step && <span> · {step.step}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#0f172a', marginTop: 1 }}>
                    {step.message ?? JSON.stringify(step)}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                    {step.ts ? new Date(step.ts).toLocaleTimeString() : ''}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {liveSteps.length === 0 && history.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--tulip-gray)', fontSize: 13, paddingTop: 32 }}>
            No agent runs yet. Trigger a pipeline to see live activity.
          </div>
        )}

        {history.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: 'var(--tulip-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 8, paddingBottom: 4 }}>Recent Runs</div>
            {history.map(run => (
              <div key={run.id} style={{ padding: '8px 10px', border: '1px solid var(--tulip-border)', borderRadius: 6, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: agentColor(run.agent_name) }}>{agentLabel(run.agent_name)}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 9999,
                    backgroundColor: run.status === 'completed' ? '#dcfce7' : run.status === 'failed' ? '#fee2e2' : '#fef9c3',
                    color: run.status === 'completed' ? '#166534' : run.status === 'failed' ? '#991b1b' : '#854d0e',
                    fontWeight: 600
                  }}>
                    {run.status}
                  </span>
                </div>
                {run.accounts?.name && <div style={{ fontSize: 11, color: 'var(--tulip-gray)' }}>{run.accounts.name}</div>}
                {run.output_summary && <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>{formatOutputSummary(run.output_summary)}</div>}
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{new Date(run.started_at).toLocaleString()}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
