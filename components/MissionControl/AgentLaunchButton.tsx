'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { PIPELINE_OPTIONS } from '@/lib/agents/agent-metadata'

interface Account {
  id: string
  name: string
}

interface Props {
  accounts: Account[]
  onStep: (step: object) => void
  onRunStart: () => void
  onRunEnd: () => void
}

type Pipeline = 'full' | 'intelligence' | 'positioning' | 'plays' | 'linkedin' | 'contact-research' | 'signal-watch'

// PIPELINE_OPTIONS is the single source of truth shared with the per-account
// Agents tab (components/AgentRunHistory.tsx) so the dropdown reads identically
// in both places. Edit lib/agents/agent-metadata.tsx to change.
const PIPELINES = PIPELINE_OPTIONS.map(p => ({ value: p.value as Pipeline, label: p.label }))

export function AgentLaunchButton({ accounts, onStep, onRunStart, onRunEnd }: Props) {
  const [running, setRunning] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id ?? '')
  const [pipeline, setPipeline] = useState<Pipeline>('full')

  const handleRun = async () => {
    if (running) return
    setRunning(true)
    onRunStart()

    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount, pipeline }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              onStep(data)
            } catch {
              // skip malformed
            }
          }
        }
      }
    } catch {
      // stream error
    } finally {
      setRunning(false)
      onRunEnd()
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <select
        value={selectedAccount}
        onChange={e => setSelectedAccount(e.target.value)}
        disabled={running}
        style={{
          fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--tulip-border)',
          backgroundColor: 'white', color: '#0f172a', outline: 'none', cursor: 'pointer',
          opacity: running ? 0.6 : 1
        }}
      >
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      <select
        value={pipeline}
        onChange={e => setPipeline(e.target.value as Pipeline)}
        disabled={running}
        style={{
          fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--tulip-border)',
          backgroundColor: 'white', color: '#0f172a', outline: 'none', cursor: 'pointer',
          opacity: running ? 0.6 : 1
        }}
      >
        {PIPELINES.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      <button
        onClick={handleRun}
        disabled={running}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px',
          borderRadius: 6, border: 'none', cursor: running ? 'not-allowed' : 'pointer',
          backgroundColor: running ? '#94a3b8' : 'var(--tulip-navy)',
          color: running ? 'white' : 'var(--tulip-celery)',
          fontSize: 12, fontWeight: 700, transition: 'background-color 0.15s',
        }}
      >
        {running ? (
          <>
            <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            Running...
          </>
        ) : (
          <><Play size={14} strokeWidth={2.5} fill="currentColor" /> Run Pipeline</>
        )}
      </button>
    </div>
  )
}
