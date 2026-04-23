'use client'

import { useEffect, useRef, useState } from 'react'
import { Zap, Square } from 'lucide-react'
import { KpiBar } from '@/components/MissionControl/KpiBar'
import { AgentActivityFeed } from '@/components/MissionControl/AgentActivityFeed'
import { AccountPulse } from '@/components/MissionControl/AccountPulse'
import { LinkedInPanel } from '@/components/MissionControl/LinkedInPanel'
import { AgentLaunchButton } from '@/components/MissionControl/AgentLaunchButton'

interface Account {
  id: string
  name: string
  tier: number
  lifecycle_stage: string
  icp_fit_score: number
  engagement_score: number
  domain?: string
}

interface Urgency {
  account_id: string
  urgency: string
  urgency_reason?: string
  reason?: string
}

export default function MissionControlPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [urgencyMap, setUrgencyMap] = useState<Record<string, Urgency>>({})
  const [liveSteps, setLiveSteps] = useState<object[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isSignalWatchRunning, setIsSignalWatchRunning] = useState(false)
  const [signalWatchHover, setSignalWatchHover] = useState(false)
  const [stopConfirming, setStopConfirming] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [stopResult, setStopResult] = useState<string | null>(null)
  const [stopHover, setStopHover] = useState(false)
  const [linkedInConnected, setLinkedInConnected] = useState(false)
  const [campaignCount, setCampaignCount] = useState<number | null>(null)
  const [runCount, setRunCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setAccounts(d.accounts ?? []))
      .catch(() => null)

    fetch('/api/linkedin/campaigns')
      .then(r => r.json())
      .then(d => {
        setLinkedInConnected(d.connected)
        setCampaignCount((d.campaigns ?? []).length)
      })
      .catch(() => null)

    fetch('/api/agents/runs?limit=500')
      .then(r => r.json())
      .then(d => setRunCount((d.runs ?? []).length))
      .catch(() => null)

    // Rehydrate urgency rankings from the most recent SignalWatcherAgent run
    // so the Account Pulse stays colored after a page reload.
    fetch('/api/agents/runs?agent_name=SignalWatcherAgent&limit=1')
      .then(r => r.json())
      .then(d => {
        const latest = (d.runs ?? [])[0]
        if (!latest?.output_summary) return
        try {
          const parsed = JSON.parse(latest.output_summary) as Urgency[]
          if (!Array.isArray(parsed)) return
          const map: Record<string, Urgency> = {}
          for (const r of parsed) if (r.account_id) map[r.account_id] = r
          setUrgencyMap(map)
        } catch { /* stale or non-JSON output; ignore */ }
      })
      .catch(() => null)

    const params = new URLSearchParams(window.location.search)
    if (params.get('linkedin') === 'connected') {
      setLinkedInConnected(true)
      window.history.replaceState({}, '', '/mission-control')
    }
  }, [])

  const handleStep = (step: object) => {
    setLiveSteps(prev => [...prev, step])

    const s = step as Record<string, unknown>
    if (s.type === 'pipeline_complete' && s.urgency_rankings) {
      const rankings = s.urgency_rankings as Urgency[]
      const map: Record<string, Urgency> = {}
      for (const r of rankings) map[r.account_id] = r
      setUrgencyMap(map)
    }
  }

  // Hard stop — flags every running/pending agent_run as failed so the UI and
  // orchestrator stop chaining new agent calls. Does NOT abort an Anthropic
  // HTTP request already mid-flight (Node can't interrupt that from here) —
  // that request will finish naturally, but the orchestrator sees the row as
  // failed and skips downstream agents on the next tick.
  const stopAllAgents = async () => {
    setStopping(true)
    try {
      const res = await fetch('/api/agents/cancel', { method: 'POST' })
      const data = await res.json()
      setStopResult(`Stopped ${data.cancelled ?? 0} agent run${data.cancelled === 1 ? '' : 's'}.`)
      setTimeout(() => setStopResult(null), 5000)
    } catch {
      setStopResult('Stop request failed.')
      setTimeout(() => setStopResult(null), 5000)
    } finally {
      setStopping(false)
      setStopConfirming(false)
    }
  }

  const runSignalWatch = async () => {
    if (isSignalWatchRunning) return
    setIsSignalWatchRunning(true)
    setLiveSteps([])
    try {
      const res = await fetch('/api/agents/signal-watch', { method: 'POST' })
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
              const data = JSON.parse(line.slice(6))
              handleStep(data)
            } catch { /* skip */ }
          }
        }
      }
    } finally {
      setIsSignalWatchRunning(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--tulip-cream)' }}>
      {/* Stop-all toast — fixed so it's visible even after the header scrolls.
          Auto-dismisses after 5s (set in stopAllAgents). */}
      {stopResult && (
        <div
          role="status"
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: '#00263E', color: 'white',
            padding: '10px 18px', borderRadius: 8,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            border: '1.5px solid #fca5a5',
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <Square size={12} fill="#fca5a5" color="#fca5a5" />
          {stopResult}
        </div>
      )}

      {/* Header band */}
      <div style={{ backgroundColor: 'var(--tulip-navy)', color: 'white', padding: '20px 32px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--tulip-teal-light)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>
                Tulip · Mission Control
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.05, letterSpacing: '-0.01em' }}>
                Account-Based Experience
              </h1>
              {(accounts.length > 0 || runCount != null) && (
                <div style={{
                  fontSize: 12, color: 'var(--tulip-teal-light)', marginTop: 6,
                  fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {accounts.length > 0 && <span>{accounts.length} accounts under management</span>}
                  {campaignCount != null && campaignCount > 0 && (
                    <>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span>{campaignCount} LinkedIn {campaignCount === 1 ? 'campaign' : 'campaigns'}</span>
                    </>
                  )}
                  {runCount != null && runCount > 0 && (
                    <>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span>{runCount.toLocaleString()} agent {runCount === 1 ? 'run' : 'runs'}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Stop-all-agents — each button owns its own relative wrapper + hover
                  state + tooltip so hovering one button never reveals the other's
                  description. Earlier version scoped hover on the outer cluster and
                  only Signal Watch had a tooltip, so hovering Stop showed Signal's
                  definition. */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setStopHover(true)}
                onMouseLeave={() => setStopHover(false)}
              >
                {stopConfirming ? (
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', borderRadius: 6,
                      backgroundColor: 'rgba(220, 38, 38, 0.15)',
                      border: '1.5px solid #fca5a5',
                    }}
                  >
                    <button
                      onClick={stopAllAgents}
                      disabled={stopping}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', borderRadius: 4,
                        border: 'none', cursor: stopping ? 'not-allowed' : 'pointer',
                        backgroundColor: '#dc2626', color: 'white',
                        fontSize: 11, fontWeight: 700, opacity: stopping ? 0.7 : 1,
                      }}
                    >
                      <Square size={11} fill="currentColor" />
                      {stopping ? 'Stopping…' : 'Confirm stop'}
                    </button>
                    <button
                      onClick={() => setStopConfirming(false)}
                      disabled={stopping}
                      style={{
                        padding: '6px 10px', borderRadius: 4,
                        border: 'none', cursor: 'pointer',
                        backgroundColor: 'transparent', color: 'white',
                        fontSize: 11, fontWeight: 600, opacity: 0.85,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setStopConfirming(true)}
                    onFocus={() => setStopHover(true)}
                    onBlur={() => setStopHover(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 6,
                      border: '1.5px solid #fca5a5',
                      backgroundColor: 'transparent',
                      color: '#fca5a5',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Square size={12} fill="currentColor" />
                    Stop all agents
                  </button>
                )}

                {stopHover && !stopConfirming && (
                  <div
                    role="tooltip"
                    style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                      width: 340, zIndex: 40,
                      backgroundColor: 'white', color: '#00263E',
                      borderRadius: 8, padding: '12px 14px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
                      fontSize: 12, lineHeight: 1.55, fontWeight: 400,
                      pointerEvents: 'none',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                      Stop All Agents
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      Flags every running or pending agent as failed in the database so the orchestrator stops chaining new agents on the next tick.
                    </div>
                    <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                      Caveat
                    </div>
                    <div style={{ color: '#5F6D77' }}>
                      Does not abort an in-flight Anthropic HTTP call already mid-request. That request finishes naturally, writes its tool-result row, and then the orchestrator sees the run flagged as failed. For a hard stop right now, restart the dev server.
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setSignalWatchHover(true)}
                onMouseLeave={() => setSignalWatchHover(false)}
              >
                <button
                  onClick={runSignalWatch}
                  disabled={isSignalWatchRunning}
                  onFocus={() => setSignalWatchHover(true)}
                  onBlur={() => setSignalWatchHover(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                    borderRadius: 6, border: '1.5px solid var(--tulip-celery)',
                    backgroundColor: 'transparent',
                    color: 'var(--tulip-celery)',
                    fontSize: 12, fontWeight: 700, cursor: isSignalWatchRunning ? 'not-allowed' : 'pointer',
                    opacity: isSignalWatchRunning ? 0.7 : 1, transition: 'all 0.15s',
                  }}
                >
                  {isSignalWatchRunning ? (
                    <>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                      Watching...
                    </>
                  ) : (
                    <><Zap size={14} strokeWidth={2.5} /> Run Signal Watch</>
                  )}
                </button>

                {signalWatchHover && !isSignalWatchRunning && (
                  <div
                    role="tooltip"
                    style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                      width: 340, zIndex: 40,
                      backgroundColor: 'white', color: '#00263E',
                      borderRadius: 8, padding: '12px 14px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
                      fontSize: 12, lineHeight: 1.55, fontWeight: 400,
                      pointerEvents: 'none',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#008CB9', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                      Signal Watcher Agent
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      Sweeps all accounts at once, re-ranks them by urgency based on unprocessed signals, and updates intent scores where the data supports it.
                    </div>
                    <div style={{ fontSize: 10, color: '#008CB9', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                      Drives
                    </div>
                    <div style={{ color: '#5F6D77' }}>
                      The colored urgency borders in Account Pulse below · the Intent score column on each account · urgency strip at top of account detail.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 32px' }}>
        {/* KPI Bar */}
        <KpiBar />

        {/* Main grid: Activity Feed + LinkedIn Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '55fr 45fr', gap: 16, marginBottom: 24 }}>
          {/* Activity Feed */}
          <div style={{ backgroundColor: 'white', border: '1px solid var(--tulip-border)', borderRadius: 10, padding: 20, minHeight: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div />
              <AgentLaunchButton
                accounts={accounts}
                onStep={handleStep}
                onRunStart={() => { setIsRunning(true); setLiveSteps([]) }}
                onRunEnd={() => setIsRunning(false)}
              />
            </div>
            <AgentActivityFeed liveSteps={liveSteps as object[]} isRunning={isRunning || isSignalWatchRunning} />
          </div>

          {/* LinkedIn Panel */}
          <div style={{ backgroundColor: 'white', border: '1px solid var(--tulip-border)', borderRadius: 10, padding: 20, minHeight: 420 }}>
            <LinkedInPanel initialConnected={linkedInConnected} />
          </div>
        </div>

        {/* Account Pulse */}
        <div style={{ backgroundColor: 'white', border: '1px solid var(--tulip-border)', borderRadius: 10, padding: 20 }}>
          <AccountPulse accounts={accounts} urgencyMap={urgencyMap} />
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
