export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/database.types'
import AccountCard from '@/components/AccountCard'
import { Building2, TrendingUp, Zap, Users } from 'lucide-react'

async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('tier', { ascending: true })
    .order('icp_fit_score', { ascending: false })

  if (error) {
    console.error('Failed to fetch accounts:', error)
    return []
  }
  return data ?? []
}

export default async function DashboardPage() {
  const accounts = await getAccounts()

  const tier1 = accounts.filter(a => a.tier === 1)
  const tier2 = accounts.filter(a => a.tier === 2)
  const tier3 = accounts.filter(a => a.tier === 3)

  const avgEngagement = accounts.length
    ? Math.round(accounts.reduce((s, a) => s + a.engagement_score, 0) / accounts.length)
    : 0

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-extrabold" style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: '-0.01em', color: '#00263E' }}>
          Account Intelligence Dashboard
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {accounts.length} named accounts · AI-powered positioning · Cross-functional ABX coordination
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Building2 className="w-5 h-5" style={{ color: '#008CB9' }} />}
          label="Tier 1 Accounts"
          value={tier1.length}
          sub="Strategic priority"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" style={{ color: '#008CB9' }} />}
          label="In Pipeline"
          value={accounts.filter(a => a.lifecycle_stage === 'pipeline').length}
          sub="Active opportunities"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" style={{ color: '#008CB9' }} />}
          label="Prospects"
          value={accounts.filter(a => a.lifecycle_stage === 'prospect').length}
          sub="Top of funnel"
        />
        <StatCard
          icon={<Users className="w-5 h-5" style={{ color: '#008CB9' }} />}
          label="Avg Engagement"
          value={`${avgEngagement}`}
          sub="Score out of 100"
        />
      </div>

      {/* Tier grids use `auto-fit` with a 400px min so cards flow naturally —
          a tier with 3 accounts lays out as 1 row of 3, a tier with 2 stretches
          each card to half-width, and no empty grid cells stranded in row 2. */}
      {tier1.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#00263E' }}>
              TIER 1
            </span>
            <span className="text-sm text-gray-500 font-medium">Strategic Accounts — highest priority, full ABX motion</span>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))' }}>
            {tier1.map(account => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </section>
      )}

      {tier2.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white bg-gray-500">
              TIER 2
            </span>
            <span className="text-sm text-gray-500 font-medium">Growth Accounts — targeted plays, scalable motions</span>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))' }}>
            {tier2.map(account => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </section>
      )}

      {tier3.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white bg-gray-400">
              TIER 3
            </span>
            <span className="text-sm text-gray-500 font-medium">Nurture Accounts — low-touch, programmatic</span>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))' }}>
            {tier3.map(account => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub: string }) {
  // Icon moved to top-right as a muted accent (not a teal-filled square on the
  // left). The value is now the unambiguous focal point; the icon adds a hint
  // of visual personality without competing with the data for attention.
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm relative">
      <div className="absolute top-3 right-3 opacity-40">
        {icon}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#5F6D77' }}>{label}</div>
      <div className="text-3xl font-bold mt-1 tabular-nums" style={{ color: '#00263E' }}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}
