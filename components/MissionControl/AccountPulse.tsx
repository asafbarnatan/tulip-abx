'use client'

import { useRouter } from 'next/navigation'

interface Account {
  id: string
  name: string
  tier: number
  lifecycle_stage: string
  icp_fit_score: number
  engagement_score: number
  domain?: string
}

type UrgencyLevel = 'critical' | 'high' | 'medium' | 'normal'

interface Urgency {
  account_id: string
  urgency: string
  urgency_reason?: string
  reason?: string
}

interface Props {
  accounts: Account[]
  urgencyMap: Record<string, Urgency>
}

const URGENCY_CONFIG: Record<UrgencyLevel, { color: string; bg: string; label: string; bar: string; width: string }> = {
  critical: { color: '#ef4444', bg: '#fef2f2', label: 'CRITICAL', bar: '#ef4444', width: '100%' },
  high: { color: '#f59e0b', bg: '#fffbeb', label: 'HIGH', bar: '#f59e0b', width: '70%' },
  medium: { color: '#008CB9', bg: '#e8f5f9', label: 'MEDIUM', bar: '#008CB9', width: '45%' },
  normal: { color: '#94a3b8', bg: '#f8fafc', label: 'NORMAL', bar: '#94a3b8', width: '20%' },
}

function normalizeUrgency(value: string | undefined): UrgencyLevel {
  const v = (value ?? '').toLowerCase()
  if (v === 'critical') return 'critical'
  if (v === 'high') return 'high'
  if (v === 'medium') return 'medium'
  return 'normal'
}

function getUrgency(account: Account, urgencyMap: Record<string, Urgency>): UrgencyLevel {
  if (urgencyMap[account.id]) return normalizeUrgency(urgencyMap[account.id].urgency)
  if (account.engagement_score >= 80) return 'high'
  if (account.engagement_score >= 60) return 'medium'
  return 'normal'
}

export function AccountPulse({ accounts, urgencyMap }: Props) {
  const router = useRouter()

  const sorted = [...accounts].sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, normal: 3 }
    const ua = getUrgency(a, urgencyMap)
    const ub = getUrgency(b, urgencyMap)
    return urgencyOrder[ua] - urgencyOrder[ub]
  })

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tulip-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Account Pulse
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {sorted.map(account => {
          const urgency = getUrgency(account, urgencyMap)
          const cfg = URGENCY_CONFIG[urgency]
          const u = urgencyMap[account.id]

          return (
            <div
              key={account.id}
              onClick={() => router.push(`/accounts/${account.id}`)}
              style={{
                backgroundColor: cfg.bg,
                border: `1px solid ${cfg.color}40`,
                borderLeft: `4px solid ${cfg.color}`,
                borderRadius: 8,
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 4px 12px ${cfg.color}30`)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{account.name}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  backgroundColor: cfg.color, color: 'white', letterSpacing: '0.08em'
                }}>
                  {cfg.label}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 9999,
                  backgroundColor: 'var(--tulip-navy)', color: 'var(--tulip-celery)', fontWeight: 600
                }}>
                  T{account.tier}
                </span>
                <span style={{ fontSize: 10, color: 'var(--tulip-gray)', textTransform: 'capitalize' }}>{account.lifecycle_stage}</span>
                <span style={{ fontSize: 10, color: 'var(--tulip-gray)' }}>ICP {account.icp_fit_score}</span>
              </div>

              <div style={{ marginBottom: 4 }}>
                <div style={{ height: 3, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: cfg.width, backgroundColor: cfg.bar, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>

              {(u?.urgency_reason || u?.reason) && (
                <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4, marginTop: 4 }}>
                  {u?.urgency_reason || u?.reason}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
