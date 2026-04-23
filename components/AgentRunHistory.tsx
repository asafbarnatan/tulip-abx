'use client'

import { useEffect, useState } from 'react'
import type { AgentRun, AgentStep } from '@/lib/database.types'

interface Props {
  accountId: string
}

import { agentColor, agentLabel } from '@/lib/agents/agent-metadata'

// Thin backcompat aliases for this file's local identifiers.
const AGENT_COLORS = new Proxy({} as Record<string, string>, {
  get: (_t, key: string) => agentColor(key),
})
const labelFor = (name: string) => agentLabel(name)

export default function AgentRunHistory({ accountId }: Props) {
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [liveLog, setLiveLog] = useState<string[]>([])
  const [pipeline, setPipeline] = useState<string>('full')

  const load = () => {
    fetch(`/api/agents/runs?account_id=${accountId}&limit=15`)
      .then(r => r.json())
      .then(d => { setRuns(d.runs ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [accountId])

  const runPipeline = async () => {
    if (isRunning) return
    setIsRunning(true)
    setLiveLog([])
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, pipeline }),
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as Record<string, unknown>
              const msg = (data.message as string) ?? (data.type as string) ?? ''
              const agent = (data.agent as string) ?? ''
              if (msg) setLiveLog(prev => [...prev, agent ? `[${agent}] ${msg}` : msg])
            } catch { /* skip */ }
          }
        }
      }
    } finally {
      setIsRunning(false)
      load()
    }
  }

  const statusStyle = (status: string) => ({
    fontSize: 10, padding: '1px 7px', borderRadius: 9999, fontWeight: 600,
    backgroundColor: status === 'completed' ? '#dcfce7' : status === 'failed' ? '#fee2e2' : status === 'running' ? '#dbeafe' : '#f1f5f9',
    color: status === 'completed' ? '#166534' : status === 'failed' ? '#991b1b' : status === 'running' ? '#1d4ed8' : '#475569',
  })

  const PIPELINES = ['full', 'intelligence', 'positioning', 'plays', 'linkedin']

  return (
    <div>
      {/* Launch bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '14px 16px', backgroundColor: 'var(--tulip-navy)', borderRadius: 8 }}>
        <select
          value={pipeline}
          onChange={e => setPipeline(e.target.value)}
          disabled={isRunning}
          style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: 'none', outline: 'none', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
        >
          {PIPELINES.map(p => (
            <option key={p} value={p} style={{ color: '#0f172a' }}>
              {p === 'full' ? 'Full Pipeline' : p.charAt(0).toUpperCase() + p.slice(1) + ' Agent'}
            </option>
          ))}
        </select>

        <button
          onClick={runPipeline}
          disabled={isRunning}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px',
            borderRadius: 6, border: '1.5px solid var(--tulip-celery)',
            backgroundColor: 'transparent', color: 'var(--tulip-celery)',
            fontSize: 12, fontWeight: 700, cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.7 : 1
          }}
        >
          {isRunning ? '⏳ Running...' : '▶ Run Pipeline'}
        </button>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 4 }}>
          Claude Opus 4.6 · {PIPELINES.indexOf(pipeline) + 1} agent{pipeline === 'full' ? 's' : ''}
        </div>
      </div>

      {/* Live log */}
      {liveLog.length > 0 && (
        <div style={{ backgroundColor: '#0f172a', borderRadius: 8, padding: 14, marginBottom: 16, fontFamily: 'monospace', fontSize: 12, maxHeight: 200, overflowY: 'auto' }}>
          {liveLog.map((line, i) => (
            <div key={i} style={{ color: '#94a3b8', marginBottom: 2 }}>
              <span style={{ color: '#475569' }}>{String(i + 1).padStart(2, '0')} </span>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Run history */}
      {loading ? (
        <div style={{ color: 'var(--tulip-gray)', fontSize: 13 }}>Loading run history...</div>
      ) : runs.length === 0 ? (
        <div style={{ color: 'var(--tulip-gray)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
          No agent runs for this account yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {runs.map(run => {
            const isExp = expanded === run.id
            const color = AGENT_COLORS[run.agent_name] ?? 'var(--tulip-gray)'
            const steps = (run.steps ?? []) as AgentStep[]

            return (
              <div key={run.id} style={{ border: '1px solid var(--tulip-border)', borderRadius: 8, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpanded(isExp ? null : run.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', backgroundColor: 'white' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color }}>{labelFor(run.agent_name)}</span>
                    <span style={{ fontSize: 11, color: 'var(--tulip-gray)' }}>{new Date(run.started_at).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={statusStyle(run.status)}>{run.status}</span>
                    <span style={{ fontSize: 12, color: 'var(--tulip-gray)' }}>{isExp ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExp && (
                  <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid var(--tulip-border)', padding: '12px 14px' }}>
                    {run.output_summary && (
                      <div style={{ fontSize: 13, color: '#0f172a', marginBottom: 10 }}>{run.output_summary}</div>
                    )}
                    {steps.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--tulip-gray)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Steps</div>
                        {steps.map((s, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', width: 20, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                            <div>
                              <span style={{ fontSize: 11, color, fontWeight: 600 }}>{s.step}</span>
                              <span style={{ fontSize: 12, color: '#334155', marginLeft: 6 }}>{s.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {run.error_message && (
                      <div style={{ marginTop: 8, padding: '8px 10px', backgroundColor: '#fee2e2', borderRadius: 6, fontSize: 12, color: '#991b1b' }}>
                        {run.error_message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
