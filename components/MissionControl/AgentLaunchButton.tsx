'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'

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

// Order matches the Full Pipeline sequence so the dropdown reads top-to-bottom
// in the same flow Nathan sees in the Agents page and the cribsheet:
// Full → AccountIntel(1) → ContactResearch(2) → Positioning(3) → Plays(4) → LinkedIn(5).
const PIPELINES: { value: Pipeline; label: string }[] = [
  { value: 'full', label: 'Full Pipeline' },
  { value: 'intelligence', label: '1 · Intelligence Only' },
  { value: 'contact-research', label: '2 · Contact Research' },
  { value: 'positioning', label: '3 · Positioning Only' },
  { value: 'plays', label: '4 · Play Recommender' },
  { value: 'linkedin', label: '5 · LinkedIn Campaign' },
]

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
