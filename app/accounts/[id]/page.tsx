export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MapPin, Users, Building, Layers, Factory } from 'lucide-react'
import { VerticalIcon } from '@/lib/industry-icons'
import { displayLocation } from '@/lib/format-location'
import type { Account, Contact, Signal, PositioningBrief, AccountAction } from '@/lib/database.types'
import BuyingGroupTab from '@/components/BuyingGroupTab'
import SignalFeed from '@/components/SignalFeed'
import PositioningBriefTab from '@/components/PositioningBriefTab'
import PlayRecommender from '@/components/PlayRecommender'
import ActionLog from '@/components/ActionLog'
import AgentRunHistory from '@/components/AgentRunHistory'
import { LinkedInPanel } from '@/components/MissionControl/LinkedInPanel'
import ScoreCircleWithTooltip from '@/components/ScoreCircleWithTooltip'

async function getAccountData(id: string) {
  const [accountRes, contactsRes, signalsRes, briefsRes, actionsRes, signalWatchRes, campaignsRes] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', id).single(),
    supabase.from('contacts').select('*').eq('account_id', id).order('created_at'),
    supabase.from('signals').select('*').eq('account_id', id).order('created_at', { ascending: false }),
    supabase.from('positioning_briefs').select('*').eq('account_id', id).order('generated_at', { ascending: false }),
    supabase.from('account_actions').select('*').eq('account_id', id).order('created_at', { ascending: false }),
    supabase.from('agent_runs').select('output_summary').eq('agent_name', 'SignalWatcherAgent').eq('status', 'completed').order('started_at', { ascending: false }).limit(1),
    supabase.from('linkedin_campaigns').select('id').eq('account_id', id),
  ])

  if (accountRes.error || !accountRes.data) return null

  // Find this account's urgency in the latest SignalWatcher run
  let urgency: { urgency: string; urgency_reason?: string } | null = null
  const latestWatch = signalWatchRes.data?.[0]
  if (latestWatch?.output_summary) {
    try {
      const rankings = JSON.parse(latestWatch.output_summary) as Array<{ account_id: string; urgency: string; urgency_reason?: string }>
      urgency = rankings.find(r => r.account_id === id) ?? null
    } catch { /* ignore */ }
  }

  return {
    account: accountRes.data as Account,
    contacts: (contactsRes.data ?? []) as Contact[],
    signals: (signalsRes.data ?? []) as Signal[],
    briefs: (briefsRes.data ?? []) as PositioningBrief[],
    actions: (actionsRes.data ?? []) as AccountAction[],
    urgency,
    campaignsCount: campaignsRes.data?.length ?? 0,
  }
}

const URGENCY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#ef4444', bg: '#fef2f2', label: 'CRITICAL' },
  high:     { color: '#f59e0b', bg: '#fffbeb', label: 'HIGH' },
  medium:   { color: '#008CB9', bg: '#e8f5f9', label: 'MEDIUM' },
  low:      { color: '#94a3b8', bg: '#f8fafc', label: 'LOW' },
  normal:   { color: '#94a3b8', bg: '#f8fafc', label: 'NORMAL' },
}

const STAGE_COLORS: Record<string, string> = {
  prospect:  'bg-blue-100 text-blue-800',
  pipeline:  'bg-amber-100 text-amber-800',
  customer:  'bg-green-100 text-green-800',
  expansion: 'bg-purple-100 text-purple-800',
}

// Industry icons are centralized in @/lib/industry-icons via iconForVertical().
// Score circles with hover tooltips live in components/ScoreCircleWithTooltip.tsx.

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getAccountData(id)
  if (!data) notFound()

  const { account, contacts, signals, briefs, actions, urgency, campaignsCount } = data
  const latestBrief = briefs[0] ?? null
  const unprocessedSignals = signals.filter(s => !s.processed).length
  const urgencyKey = (urgency?.urgency ?? 'normal').toLowerCase()
  const urgencyCfg = URGENCY_STYLE[urgencyKey] ?? URGENCY_STYLE.normal

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Account header */}
      <div className="bg-white border rounded-xl p-6 mb-4 shadow-sm"
           style={{ borderTop: `3px solid ${urgencyCfg.color}` }}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ width: 56, height: 56, backgroundColor: '#F2EEA1' }}
              aria-hidden="true"
            >
              <VerticalIcon vertical={account.industry_vertical} size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold" style={{ color: '#00263E' }}>{account.name}</h1>
                <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${STAGE_COLORS[account.lifecycle_stage]}`}>
                  {account.lifecycle_stage.charAt(0).toUpperCase() + account.lifecycle_stage.slice(1)}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: account.tier === 1 ? '#00263E' : '#6b7280' }}>
                  TIER {account.tier}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {account.industry_vertical}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {displayLocation(account.headquarters, account.geography)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {(account.employee_count ?? 0).toLocaleString()} employees
                </span>
                {account.manufacturing_plants_count != null && (
                  <span className="flex items-center gap-1" title="Manufacturing plants / production facilities">
                    <Factory className="w-3.5 h-3.5" />
                    {account.manufacturing_plants_count.toLocaleString()} plants
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  Digital maturity {account.digital_maturity}/5
                </span>
              </div>
              {account.revenue_estimate && (
                <p className="text-xs text-gray-400 mt-1">{account.revenue_estimate}</p>
              )}
            </div>
          </div>

          {/* Score circles — hover any one for definition, generating agent, and criteria */}
          <div className="flex items-center gap-5">
            <ScoreCircleWithTooltip value={account.icp_fit_score} scoreKey="icp" />
            <ScoreCircleWithTooltip value={account.intent_score} scoreKey="intent" />
            <ScoreCircleWithTooltip value={account.engagement_score} scoreKey="engagement" />
          </div>
        </div>

        {account.description && (
          <p className="text-sm text-gray-600 mt-4 pt-4 border-t leading-relaxed">{account.description}</p>
        )}

        {/* Quick meta */}
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-400 flex-wrap">
          {account.assigned_ae ? (
            <span>AE: <span className="text-gray-600 font-medium">{account.assigned_ae}</span></span>
          ) : (
            <span className="italic text-gray-400">AE assignment: unassigned — use Actions tab to attach a stakeholder role</span>
          )}
          {account.assigned_csm && <span>CSM: <span className="text-gray-600 font-medium">{account.assigned_csm}</span></span>}
          {account.primary_use_case && <span>Use case: <span className="text-gray-600 font-medium">{account.primary_use_case}</span></span>}
          {unprocessedSignals > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-600 font-medium">{unprocessedSignals} new signal{unprocessedSignals > 1 ? 's' : ''}</span>
            </span>
          )}
        </div>
      </div>

      {/* Urgency tile — moved BETWEEN the account header and the tabs so the
          "Critical" / "High" / etc. label is the first thing readable after the
          account identity. Larger label, quoted reason, hover shows what generated it. */}
      {urgency && (
        <div
          className="mb-6 rounded-xl px-5 py-4 flex items-start gap-4 shadow-sm"
          style={{
            backgroundColor: 'white',
            border: `1px solid ${urgencyCfg.color}33`,
            borderLeft: `5px solid ${urgencyCfg.color}`,
          }}
        >
          <div className="flex flex-col items-center shrink-0" style={{ minWidth: 110 }}>
            <div
              className="text-[9px] font-bold tracking-[0.12em] uppercase mb-1"
              style={{ color: urgencyCfg.color, opacity: 0.8 }}
            >
              Urgency
            </div>
            <div
              className="rounded-md px-3 py-1 text-sm font-bold tracking-wider"
              style={{ backgroundColor: urgencyCfg.color, color: 'white', letterSpacing: '0.1em' }}
            >
              {urgencyCfg.label}
            </div>
          </div>
          <div className="flex-1">
            {urgency.urgency_reason && (
              <p className="text-sm leading-relaxed mb-1.5" style={{ color: '#0f172a', fontWeight: 500 }}>
                {urgency.urgency_reason}
              </p>
            )}
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Ranked by <span className="font-semibold text-gray-500">Signal Watcher Agent</span> — based on unprocessed signals, source credibility, recency, and volume. Re-run from Mission Control to refresh.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="brief">
        <TabsList className="mb-4">
          <TabsTrigger value="brief">
            Positioning Brief
            {latestBrief && !latestBrief.approved && (
              <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Draft</span>
            )}
            {latestBrief?.approved && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 bg-green-100 text-green-700 border-green-200">Approved</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="plays">Recommended Plays</TabsTrigger>
          <TabsTrigger value="buying-group">
            Buying Group
            {contacts.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{contacts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="signals">
            Signals
            {unprocessedSignals > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 bg-amber-100 text-amber-700 border-amber-200">{unprocessedSignals}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actions">
            Actions
            {actions.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{actions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            Campaigns
            {campaignsCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{campaignsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="brief">
          <PositioningBriefTab
            accountId={account.id}
            latestBrief={latestBrief}
            contacts={contacts}
          />
        </TabsContent>

        <TabsContent value="plays">
          <PlayRecommender account={account} />
        </TabsContent>

        <TabsContent value="buying-group">
          <BuyingGroupTab contacts={contacts} accountId={account.id} accountName={account.name} />
        </TabsContent>

        <TabsContent value="signals">
          <SignalFeed accountId={account.id} initialSignals={signals} />
        </TabsContent>

        <TabsContent value="actions">
          <ActionLog accountId={account.id} initialActions={actions} contacts={contacts} initialInteractionStage={account.interaction_stage ?? null} />
        </TabsContent>

        <TabsContent value="campaigns">
          <div className="bg-white border rounded-xl p-4">
            <LinkedInPanel initialConnected={false} accountId={account.id} />
          </div>
        </TabsContent>

        <TabsContent value="agents">
          <AgentRunHistory accountId={account.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
