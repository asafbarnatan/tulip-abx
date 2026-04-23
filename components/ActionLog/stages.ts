import type { InteractionStage } from '@/lib/database.types'

// Full client lifecycle — pre-sale, close milestone, post-sale customer motion,
// and the terminal loss branch. The stepper renders "phase" groupings so the
// pre-sale flow and post-sale flow are visually distinct rather than one long rail.

export type LifecyclePhase = 'sales' | 'customer' | 'terminal'

export interface StageDef {
  key: InteractionStage
  label: string
  tagline: string
  phase: LifecyclePhase
  terminal?: boolean
  terminalKind?: 'win' | 'loss'
}

export const STAGES: StageDef[] = [
  // ── Sales motion ──
  { key: 'prospecting', label: 'Prospecting', tagline: 'Identifying the account and first outreach', phase: 'sales' },
  { key: 'discovery',   label: 'Discovery',   tagline: 'First meeting, qualifying fit', phase: 'sales' },
  { key: 'demo_eval',   label: 'Demo & Evaluation', tagline: 'Technical deep-dive, POC', phase: 'sales' },
  { key: 'proposal',    label: 'Proposal',    tagline: 'Pricing, scoping, contract terms', phase: 'sales' },
  { key: 'negotiation', label: 'Negotiation', tagline: 'Final back-and-forth before decision', phase: 'sales' },

  // ── Close milestone (transitions from sales → customer) ──
  { key: 'closed_won',  label: 'Closed-Won',  tagline: 'Contract signed. Handoff to onboarding.', phase: 'customer', terminalKind: 'win' },

  // ── Customer motion (post-sale lifecycle) ──
  { key: 'onboarding',  label: 'Onboarding',  tagline: 'First 90 days — initial deployment and training', phase: 'customer' },
  { key: 'adoption',    label: 'Adoption',    tagline: 'Steady-state customer, measuring usage and value', phase: 'customer' },
  { key: 'expansion',   label: 'Expansion',   tagline: 'Upsell to new sites, teams, or use cases', phase: 'customer' },
  { key: 'renewal',     label: 'Renewal',     tagline: 'Contract renewal conversation', phase: 'customer' },

  // ── Terminal loss ──
  { key: 'closed_lost', label: 'Closed-Lost', tagline: 'No deal — capture reason for future', phase: 'terminal', terminal: true, terminalKind: 'loss' },
]

export const STAGE_BY_KEY: Record<InteractionStage, StageDef> = Object.fromEntries(
  STAGES.map(s => [s.key, s])
) as Record<InteractionStage, StageDef>

export function stageIndex(key: InteractionStage | null | undefined): number {
  if (!key) return 0
  const i = STAGES.findIndex(s => s.key === key)
  return i >= 0 ? i : 0
}

// Primary pre-sale rail — the 5 stages before the close milestone.
export const SALES_STAGES = STAGES.filter(s => s.phase === 'sales')

// Post-sale rail — starts at closed_won, then onboarding → adoption → expansion → renewal.
export const CUSTOMER_STAGES = STAGES.filter(s => s.phase === 'customer')

// Terminal loss state (closed_lost) — rendered separately as a branch.
export const TERMINAL_STAGES = STAGES.filter(s => s.phase === 'terminal')
