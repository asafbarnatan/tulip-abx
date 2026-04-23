'use client'

import { useEffect, useRef, useState } from 'react'

// ───────────────────────────────────────────────────────────────────────────
// KPI shape — matches the /api/kpis response
// ───────────────────────────────────────────────────────────────────────────

interface KpiData {
  // System
  active_agents: number
  total_accounts: number
  tier1_count: number
  active_campaigns: number
  // Pipeline health
  pipeline_coverage: number
  avg_icp_score: number
  signal_backlog: number
  account_velocity: number
  // Strategy + Execution
  brief_approval: number
  plays_recommended: number
  plays_executed: number
  // LinkedIn aggregates
  total_impressions: number
  total_clicks: number
  total_leads: number
  total_spend: number
  linkedin_ctr: number
}

type HistoryData = Partial<Record<keyof KpiData, number[]>>

// ───────────────────────────────────────────────────────────────────────────
// Threshold bands — green / amber / red. Drives the top border color.
// Signal Backlog is inverted (lower = better); everything else is higher = better.
// Tiles not in this map render with a neutral navy top border (informational).
// ───────────────────────────────────────────────────────────────────────────

const BANDS: Partial<Record<keyof KpiData, { green: number; amber: number; inverted?: boolean }>> = {
  pipeline_coverage: { green: 60, amber: 40 },
  avg_icp_score:     { green: 75, amber: 60 },
  signal_backlog:    { green: 5, amber: 15, inverted: true },
  account_velocity:  { green: 1, amber: 0 },
  brief_approval:    { green: 80, amber: 50 },
  plays_recommended: { green: 2, amber: 1 },
  plays_executed:    { green: 1, amber: 0.5 },
  linkedin_ctr:      { green: 0.5, amber: 0.2 },
}

function bandColor(key: keyof KpiData, value: number): string {
  const b = BANDS[key]
  if (!b) return '#008CB9' // informational tiles — neutral teal
  if (b.inverted) {
    if (value <= b.green) return '#22c55e'
    if (value <= b.amber) return '#f59e0b'
    return '#ef4444'
  }
  if (value >= b.green) return '#22c55e'
  if (value >= b.amber) return '#f59e0b'
  return '#ef4444'
}

// ───────────────────────────────────────────────────────────────────────────
// Tile definitions
// Each tile carries label, formatter, short description (in-card), and a long-form
// definition + formula that render in the hover tooltip. The tooltip is how the
// demo presenter answers "what does this tile mean?" live in the room.
// ───────────────────────────────────────────────────────────────────────────

interface TileDef {
  key: keyof KpiData
  label: string
  format: (v: number) => string
  description: string
  definition: string
  formula: string
}

interface Group {
  title: string
  caption?: string
  columns: number
  tiles: TileDef[]
}

const GROUPS: Group[] = [
  {
    title: 'System Overview',
    caption: 'How much work the platform is managing right now',
    columns: 4,
    tiles: [
      {
        key: 'active_agents',
        label: 'Active Agents',
        format: v => `${v}`,
        description: 'Claude Opus 4.6 agents',
        definition: 'How many autonomous agents are deployed and available to run in this platform instance.',
        formula: 'Count of named agent classes registered in the orchestrator: AccountIntelligence, Positioning, PlayOrchestrator, SignalWatcher, LinkedInOutreach.',
      },
      {
        key: 'total_accounts',
        label: 'Accounts',
        format: v => `${v}`,
        description: 'Named accounts under management',
        definition: 'The number of named accounts currently tracked by the ABX system — your target-account universe.',
        formula: 'COUNT(*) FROM accounts',
      },
      {
        key: 'tier1_count',
        label: 'Tier-1 Accounts',
        format: v => `${v}`,
        description: 'Priority accounts (denominator for pipeline KPIs)',
        definition: 'The subset of accounts classified as Tier 1 — your highest-priority targets. This is the denominator for Pipeline Coverage and Play KPIs.',
        formula: 'COUNT(*) FROM accounts WHERE tier = 1',
      },
      {
        key: 'active_campaigns',
        label: 'Live Campaigns',
        format: v => `${v}`,
        description: 'LinkedIn campaigns currently running',
        definition: 'LinkedIn campaigns with status = active — currently serving impressions and accruing real spend.',
        formula: "COUNT(*) FROM linkedin_campaigns WHERE status = 'active'",
      },
    ],
  },
  {
    title: 'ABX Pipeline Health',
    caption: 'Account-level signals of GTM progression',
    columns: 4,
    tiles: [
      {
        key: 'pipeline_coverage',
        label: 'Pipeline Coverage',
        format: v => `${v}%`,
        description: 'Tier-1 accounts in pipeline or customer stage',
        definition: "The share of your Tier-1 accounts that have actually progressed beyond 'prospect' into 'pipeline' or 'customer' lifecycle stages. Directly answers: are priority accounts moving?",
        formula: 'Tier-1 accounts with lifecycle_stage IN (pipeline, customer) ÷ total Tier-1 accounts × 100. Band: ≥60% green, 40-60% amber, <40% red.',
      },
      {
        key: 'avg_icp_score',
        label: 'Avg ICP Score',
        format: v => `${v}`,
        description: 'Tier 1+2 fit score (0-100)',
        definition: 'Average Ideal Customer Profile fit score across your Tier 1 and Tier 2 accounts. High score = your target list is well-qualified; low score = you are chasing mismatched prospects.',
        formula: 'AVG(icp_fit_score) for accounts WHERE tier IN (1, 2). ICP score is computed by lib/icp-scorer.ts from industry, size, geography, digital maturity. Band: ≥75 green, 60-75 amber, <60 red.',
      },
      {
        key: 'signal_backlog',
        label: 'Signal Backlog',
        format: v => `${v}`,
        description: 'Unprocessed intent / news / engagement signals',
        definition: 'How many signals (intent events, news, engagement touches, firmographic changes) have been captured but not yet triaged. A growing backlog means the team is generating more intelligence than it can act on.',
        formula: "COUNT(*) FROM signals WHERE processed = false. Inverted band (lower is better): ≤5 green, 6-15 amber, >15 red.",
      },
      {
        key: 'account_velocity',
        label: 'Account Velocity',
        format: v => `+${v}`,
        description: 'Lifecycle stage advancements, 30d',
        definition: 'Count of lifecycle stage advancements (e.g. prospect → pipeline, pipeline → customer) logged in the last 30 days. Measures whether effort is actually converting into stage progression — the counterpart to Plays Executed.',
        formula: "COUNT(*) FROM account_actions WHERE outcome = 'stage_advanced' AND created_at >= NOW() - 30 days. Band: ≥1 green, else red.",
      },
    ],
  },
  {
    title: 'Strategy & Execution',
    caption: 'From agent-generated strategy to human follow-through',
    columns: 3,
    tiles: [
      {
        key: 'brief_approval',
        label: 'Brief Approval',
        format: v => `${v}%`,
        description: 'Accounts with an approved positioning brief',
        definition: 'Share of accounts that have at least one positioning brief reviewed and approved. Measures whether AI-generated strategy is making it through review — and therefore usable for outreach.',
        formula: 'Accounts with any approved positioning_brief ÷ accounts with any brief × 100. Band: ≥80% green, 50-80% amber, <50% red.',
      },
      {
        key: 'plays_recommended',
        label: 'Plays Recommended',
        format: v => `${v}/acct`,
        description: 'Agent-drafted plays per Tier-1 account, 30d',
        definition: 'Average number of outreach plays drafted by the PlayOrchestrator agent per Tier-1 account in the last 30 days. This is the volume of strategic recommendations — not executions. A play is recommended when the agent writes it; it is executed only when a human acts on it.',
        formula: "COUNT(*) FROM account_actions WHERE action_type IN (demo, meeting, proposal, email, call) AND created_at >= NOW() - 30 days, divided by Tier-1 account count. Includes rows with outcome = 'pending'. Band: ≥2 green, 1-2 amber, <1 red.",
      },
      {
        key: 'plays_executed',
        label: 'Plays Executed',
        format: v => `${v}/acct`,
        description: 'Plays acted on by a human, 30d',
        definition: 'Average number of plays the human team has actually executed per Tier-1 account in the last 30 days. The difference between Plays Recommended and Plays Executed shows how much drafted strategy is sitting unacted.',
        formula: "Same filter as Plays Recommended, but WHERE outcome IS NOT NULL AND outcome != 'pending'. Includes outcomes like 'completed', 'replied', 'declined', 'stage_advanced'. Band: ≥1 green, 0.5-1 amber, <0.5 red.",
      },
    ],
  },
  {
    title: 'LinkedIn Campaign Performance',
    caption: 'Aggregate totals across every live + historical campaign in the account',
    columns: 5,
    tiles: [
      {
        key: 'total_impressions',
        label: 'Impressions',
        format: v => v.toLocaleString(),
        description: 'Aggregate ad views',
        definition: 'Total number of times LinkedIn served any of your ads. The top of the funnel — how many eyeballs your content reached.',
        formula: 'SUM(impressions) across all linkedin_campaigns rows, regardless of status.',
      },
      {
        key: 'total_clicks',
        label: 'Clicks',
        format: v => v.toLocaleString(),
        description: 'Landing page clicks',
        definition: 'Total number of clicks from LinkedIn ads to the destination URL (e.g. tulip.co/industries/pharma-manufacturing).',
        formula: 'SUM(clicks) across all linkedin_campaigns rows.',
      },
      {
        key: 'linkedin_ctr',
        label: 'Aggregate CTR',
        format: v => `${v}%`,
        description: 'Clicks ÷ impressions',
        definition: 'Click-through rate across every campaign combined. The primary signal of creative/targeting fit. Industry median for B2B LinkedIn Sponsored Content is ~0.35%; top quartile is ≥0.65%.',
        formula: 'SUM(clicks) ÷ SUM(impressions) × 100, rounded to 2 decimals. Band: ≥0.5% green, 0.2-0.5% amber, <0.2% red.',
      },
      {
        key: 'total_leads',
        label: 'Leads',
        format: v => v.toLocaleString(),
        description: 'Form fills + conversions',
        definition: 'Total conversions tracked via LinkedIn Insight Tag or lead-gen form submissions across all campaigns.',
        formula: 'SUM(leads) across all linkedin_campaigns rows.',
      },
      {
        key: 'total_spend',
        label: 'Spend',
        format: v => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        description: 'Total media budget consumed',
        definition: 'Total dollars spent on LinkedIn advertising across all campaigns, ever. Sums the cost_usd field populated by adAnalyticsV2 or by CSV/manual metric updates.',
        formula: 'SUM(cost_usd) across all linkedin_campaigns rows.',
      },
    ],
  },
]

// ───────────────────────────────────────────────────────────────────────────
// Sparkline (unchanged, used for band-governed tiles only)
// ───────────────────────────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null
  const w = 60, h = 16, pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (values.length - 1)
    const y = pad + (h - pad * 2) * (1 - (v - min) / range)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastX = pad + ((values.length - 1) * (w - pad * 2)) / (values.length - 1)
  const lastY = pad + (h - pad * 2) * (1 - (values[values.length - 1] - min) / range)
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" points={points} opacity={0.55} />
      <circle cx={lastX} cy={lastY} r={2} fill={color} />
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Hover tooltip — shows definition + formula on tile hover
// ───────────────────────────────────────────────────────────────────────────

function DefinitionTooltip({ tile, visible, onEnter, onLeave }: {
  tile: TileDef
  visible: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  if (!visible) return null
  return (
    <div
      role="tooltip"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0,
        width: 320, zIndex: 40,
        backgroundColor: '#00263E', color: 'white',
        borderRadius: 8, padding: '12px 14px',
        boxShadow: '0 10px 30px rgba(0, 38, 62, 0.25)',
        fontSize: 12, lineHeight: 1.55, fontWeight: 400,
        maxHeight: 360, overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: 10, color: '#F2EEA1', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        Definition
      </div>
      <div style={{ marginBottom: 8 }}>{tile.definition}</div>
      <div style={{ fontSize: 10, color: '#F2EEA1', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        How it&apos;s calculated
      </div>
      <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, color: '#B6DCE1' }}>
        {tile.formula}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Single tile — typography matches across groups
// ───────────────────────────────────────────────────────────────────────────

function Tile({ def, value, history }: { def: TileDef; value: number; history?: number[] }) {
  const [hovered, setHovered] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const color = bandColor(def.key, value)
  const banded = def.key in BANDS

  const openNow = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    setHovered(true)
  }
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setHovered(false), 200)
  }

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={closeSoon}
      tabIndex={0}
    >
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid var(--tulip-border)',
          borderTop: `3px solid ${color}`,
          borderRadius: 8,
          padding: '14px 16px',
          cursor: 'help',
          transition: 'box-shadow 0.15s, transform 0.15s',
          boxShadow: hovered ? '0 4px 12px rgba(0, 38, 62, 0.08)' : 'none',
          height: '100%',
        }}
      >
        <div style={{
          fontSize: 11, color: 'var(--tulip-gray)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          fontWeight: 600, marginBottom: 4,
        }}>
          {def.label}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
          <div style={{
            fontSize: 24, fontWeight: 700, color: '#0f172a', lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {def.format(value)}
          </div>
          {banded && history && history.length >= 2 && <Sparkline values={history} color={color} />}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tulip-gray)', lineHeight: 1.4 }}>{def.description}</div>
      </div>
      <DefinitionTooltip tile={def} visible={hovered} onEnter={openNow} onLeave={closeSoon} />
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Group header — titles each section of tiles
// ───────────────────────────────────────────────────────────────────────────

function GroupHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
      <h2 style={{
        fontSize: 11, color: '#00263E',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontWeight: 800,
        margin: 0,
      }}>
        {title}
      </h2>
      {caption && (
        <div style={{ fontSize: 11, color: 'var(--tulip-gray)', fontWeight: 400 }}>
          {caption}
        </div>
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Exported component
// ───────────────────────────────────────────────────────────────────────────

export function KpiBar() {
  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [history, setHistory] = useState<HistoryData | null>(null)

  useEffect(() => {
    const load = () => fetch('/api/kpis').then(r => r.json()).then(setKpis).catch(() => null)
    const loadHistory = () => fetch('/api/kpis/history').then(r => r.json()).then(setHistory).catch(() => null)
    load()
    loadHistory()
    const id = setInterval(() => { load(); loadHistory() }, 30000)
    return () => clearInterval(id)
  }, [])

  if (!kpis) {
    // Skeleton matches real layout — 4 groups with column counts 4/4/3/5.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 20 }}>
        {GROUPS.map(g => (
          <div key={g.title}>
            <GroupHeader title={g.title} caption={g.caption} />
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${g.columns}, 1fr)`, gap: 12 }}>
              {g.tiles.map(t => (
                <div
                  key={t.key}
                  className="animate-pulse"
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--tulip-border)',
                    borderTop: '3px solid #e2e8f0',
                    borderRadius: 8, padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--tulip-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, opacity: 0.5 }}>{t.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 48, height: 26, backgroundColor: '#f1f5f9', borderRadius: 4 }} />
                    <div style={{ width: 40, height: 14, backgroundColor: '#f1f5f9', borderRadius: 2 }} />
                  </div>
                  <div style={{ width: '80%', height: 11, backgroundColor: '#f1f5f9', borderRadius: 2 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 20 }}>
      {GROUPS.map(group => (
        <div key={group.title}>
          <GroupHeader title={group.title} caption={group.caption} />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${group.columns}, 1fr)`, gap: 12 }}>
            {group.tiles.map(def => (
              <Tile
                key={def.key}
                def={def}
                value={kpis[def.key]}
                history={history?.[def.key]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
