'use client'

import { useRef, useState } from 'react'

// Structured criterion — each score breaks down into named criteria with tiered
// sub-points. Rendered as nested bullets in the tooltip so the math is legible.
interface Criterion {
  name: string
  tiers: { value: string; score?: string }[]
  note?: string
}

interface ScoreDef {
  label: string
  color: string
  definition: string
  generator: string
  criteria: Criterion[]
}

const SCORE_DEFINITIONS: Record<'icp' | 'intent' | 'engagement', ScoreDef> = {
  icp: {
    label: 'ICP Fit',
    color: '#00263E',
    definition: 'How well this account matches Tulip\'s Ideal Customer Profile. Higher = stronger fit for the Tulip manufacturing SaaS motion.',
    generator: 'Deterministic rule in lib/icp-scorer.ts, recomputed whenever firmographics change. Account Intelligence Agent can also refresh it via update_account_scores when it re-reads the account.',
    criteria: [
      {
        name: 'Industry vertical',
        tiers: [
          { value: 'Discrete Manufacturing / Pharma / Medical Device', score: '+30' },
          { value: 'Aerospace & Defense', score: '+25' },
          { value: 'Life Sciences', score: '+20' },
        ],
      },
      {
        name: 'Geography',
        tiers: [
          { value: 'Japan / Europe (strategic priorities)', score: '+25' },
          { value: 'North America', score: '+20' },
        ],
      },
      {
        name: 'Employee count',
        tiers: [
          { value: '10,000+', score: '+30' },
          { value: '5,000 – 10,000', score: '+25' },
          { value: '1,000 – 5,000', score: '+20' },
          { value: '500 – 1,000', score: '+15' },
          { value: 'Under 500', score: '+10' },
        ],
      },
      {
        name: 'Digital maturity (1–5 scale)',
        note: '1 = still all paper, 2 = basic digitization, 3 = partial/mixed systems, 4 = mostly digital & integrated, 5 = fully connected / AI in production.',
        tiers: [
          { value: 'Level 2–3 (sweet spot: ready to invest, room to grow)', score: '+15' },
          { value: 'Level 4 (mostly digital, expansion opportunity)', score: '+12' },
          { value: 'Level 1 (hasn\'t started — longer education cycle)', score: '+10' },
          { value: 'Level 5 (already advanced — harder to displace incumbent)', score: '+8' },
        ],
      },
    ],
  },
  intent: {
    label: 'Intent',
    color: '#008CB9',
    definition: 'Real-time measure of how actively this account appears to be in-market for Tulip\'s solution right now. Higher = more recent, more intense buying signals.',
    generator: 'Signal Watcher Agent (primary — via update_account_intent_score after sweeping signals). Account Intelligence Agent can also adjust it when it synthesizes a new signal for the account.',
    criteria: [
      {
        name: 'Signal presence',
        tiers: [
          { value: 'Job postings for MES / batch records / digital work instructions' },
          { value: 'News about digital-transformation initiatives' },
          { value: 'Regulatory events (e.g. upcoming GMP / EMA inspections)' },
          { value: 'Product recalls or quality events driving modernization' },
        ],
      },
      {
        name: 'Signal recency',
        tiers: [{ value: 'Fresh signals (last 30 days) weighted higher than stale ones' }],
      },
      {
        name: 'Source credibility',
        tiers: [{ value: 'Named sources (trade press, company PR) weighted higher than rumor' }],
      },
      {
        name: 'Signal volume',
        tiers: [{ value: 'Multiple signals on the same theme bump intent more than one-off mentions' }],
      },
    ],
  },
  engagement: {
    label: 'Engagement',
    color: '#f59e0b',
    definition: 'How much real two-way interaction has happened between Tulip and this account. Higher = the relationship is warm, not theoretical.',
    generator: 'Account Intelligence Agent only (via update_account_scores, based on account_actions history). Also updated manually when reps log touchpoints via the Actions tab.',
    criteria: [
      {
        name: 'Touchpoint volume (last 30 days)',
        tiers: [{ value: 'Demos, meetings, proposals, emails, calls logged in account_actions' }],
      },
      {
        name: 'Outcome quality',
        tiers: [
          { value: 'stage_advanced (strongest)' },
          { value: 'completed' },
          { value: 'replied' },
          { value: 'pending (weakest — draft, not yet executed)' },
        ],
      },
      {
        name: 'Buying group coverage',
        tiers: [{ value: 'Breadth of stakeholder roles touched, not just one contact' }],
      },
      {
        name: 'Recency',
        tiers: [{ value: 'Time since last meaningful interaction — recent > old' }],
      },
    ],
  },
}

type ScoreKey = keyof typeof SCORE_DEFINITIONS

interface Props {
  value: number
  scoreKey: ScoreKey
}

export default function ScoreCircleWithTooltip({ value, scoreKey }: Props) {
  const [hovered, setHovered] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Open immediately when the user enters either the trigger or the tooltip.
  // Close after a short delay to let the cursor traverse the 8px gap between
  // the circle and the tooltip without losing hover state — this is what lets
  // the user actually scroll through the tooltip content.
  const openNow = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setHovered(true)
  }
  const closeSoon = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setHovered(false), 200)
  }

  const def = SCORE_DEFINITIONS[scoreKey]
  const radius = 20
  const circ = 2 * Math.PI * radius
  const offset = circ - (value / 100) * circ

  return (
    <div
      className="relative flex flex-col items-center gap-1"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={closeSoon}
      tabIndex={0}
      style={{ cursor: 'help' }}
    >
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="5" />
        <circle
          cx="26" cy="26" r={radius} fill="none"
          stroke={def.color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
        />
        <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill={def.color}>{value}</text>
      </svg>
      <span className="text-xs text-gray-500">{def.label}</span>

      {hovered && (
        <div
          role="tooltip"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 400, zIndex: 50,
            backgroundColor: '#00263E', color: 'white',
            borderRadius: 8, padding: '14px 16px',
            boxShadow: '0 10px 30px rgba(0, 38, 62, 0.3)',
            fontSize: 12, lineHeight: 1.55, fontWeight: 400,
            textAlign: 'left',
            maxHeight: 520, overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 10, color: '#F2EEA1', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            {def.label} · Score {value}/100
          </div>

          <div style={{ marginBottom: 12 }}>{def.definition}</div>

          <div style={{ fontSize: 10, color: '#F2EEA1', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            Generated by
          </div>
          <div style={{ marginBottom: 12, color: '#B6DCE1' }}>{def.generator}</div>

          <div style={{ fontSize: 10, color: '#F2EEA1', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Criteria
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {def.criteria.map((c, i) => (
              <div key={i}>
                <div style={{ color: 'white', fontWeight: 600, marginBottom: 3 }}>{c.name}</div>
                {c.note && (
                  <div style={{ color: '#B6DCE1', fontSize: 11, fontStyle: 'italic', marginBottom: 4, lineHeight: 1.5 }}>
                    {c.note}
                  </div>
                )}
                <ul style={{ margin: 0, paddingLeft: 16, color: '#B6DCE1', listStyle: 'disc' }}>
                  {c.tiers.map((t, j) => (
                    <li key={j} style={{ marginBottom: 2, lineHeight: 1.5 }}>
                      {t.value}
                      {t.score && (
                        <span style={{ color: '#F2EEA1', fontWeight: 700, marginLeft: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11 }}>
                          {t.score}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
