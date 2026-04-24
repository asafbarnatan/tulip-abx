export type IndustryVertical = 'Discrete Manufacturing' | 'Pharmaceuticals' | 'Medical Device' | 'Aerospace & Defense' | 'Life Sciences'
export type Geography = 'Japan' | 'Europe' | 'North America'
export type LifecycleStage = 'prospect' | 'pipeline' | 'customer' | 'expansion'
export type InteractionStage =
  | 'prospecting'
  | 'discovery'
  | 'demo_eval'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'onboarding'
  | 'adoption'
  | 'expansion'
  | 'renewal'
  | 'closed_lost'
export type PersonaType = 'Champion' | 'Economic Buyer' | 'Technical Evaluator' | 'End User' | 'Blocker' | 'Unassigned'
export type SignalType = 'intent' | 'engagement' | 'news' | 'firmographic' | 'product_usage'
export type SignalSentiment = 'positive' | 'neutral' | 'negative'
export type ActionType = 'email' | 'call' | 'meeting' | 'linkedin' | 'event' | 'content_send' | 'demo' | 'proposal' | 'other'
export type TeamType = 'marketing' | 'sales' | 'cs' | 'sdr'

export interface Account {
  id: string
  name: string
  domain: string
  industry_vertical: IndustryVertical
  sub_vertical: string | null
  geography: Geography
  employee_count: number
  revenue_estimate: string | null
  tier: 1 | 2 | 3
  icp_fit_score: number // 0-100
  intent_score: number // 0-100
  engagement_score: number // 0-100
  lifecycle_stage: LifecycleStage
  interaction_stage: InteractionStage | null
  primary_use_case: string | null
  digital_maturity: 1 | 2 | 3 | 4 | 5
  assigned_ae: string | null
  assigned_csm: string | null
  headquarters: string | null
  description: string | null
  manufacturing_plants_count: number | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  account_id: string
  name: string
  title: string
  persona_type: PersonaType
  linkedin_url: string | null
  source_url: string | null
  email: string | null
  phone: string | null
  last_touched_at: string | null
  inferred_pain_points: string[]
  preferred_channel: string | null
  created_at: string
}

export interface Signal {
  id: string
  account_id: string
  signal_type: SignalType
  source: string
  content: string
  sentiment: SignalSentiment
  source_url: string | null
  published_at: string | null
  created_at: string
  processed: boolean
}

export interface PositioningStatement {
  for: string
  category: string
  key_benefit: string
  unlike: string
  because: string
}

export interface PositioningBrief {
  id: string
  account_id: string
  core_message: string
  persona_messages: Record<string, string>
  proof_points: string[]
  objection_handlers: Array<{ objection: string; response: string }>
  recommended_tone: string
  key_themes: string[]
  positioning_statement: PositioningStatement | null
  approved: boolean
  generated_at: string
}

// StakeholderRole is stored as free text at the DB layer — this type is a loose
// hint for the UI preset options, but any string is valid (e.g. "VP Rev Ops").
export type StakeholderRole = string
export const STAKEHOLDER_ROLE_PRESETS = ['AE', 'CSM', 'Sales', 'Marketing', 'Ecosystem'] as const

export interface AccountAction {
  id: string
  account_id: string
  action_type: ActionType
  performed_by: string | null
  team: TeamType
  contact_name: string | null
  outcome: string | null
  notes: string | null
  assigned_role: StakeholderRole | null
  assigned_name: string | null
  created_at: string
}

// ---- Agentic Marketing types ----

export type AgentName =
  | 'AccountIntelligenceAgent'
  | 'PositioningAgent'
  | 'SignalWatcherAgent'
  | 'PlayOrchestratorAgent'
  | 'LinkedInOutreachAgent'

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface AgentStep {
  ts: string
  agent: AgentName
  step: string
  message: string
  tool_call?: string
}

export interface AgentRun {
  id: string
  agent_name: AgentName
  status: AgentStatus
  trigger_source: string | null
  account_id: string | null
  input_summary: string | null
  output_summary: string | null
  steps: AgentStep[]
  error_message: string | null
  duration_ms: number | null
  model: string
  started_at: string
  completed_at: string | null
}

export interface LinkedInCampaign {
  id: string
  account_id: string | null
  linkedin_campaign_id: string | null
  campaign_name: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed'
  objective: string | null
  ad_copy: string | null
  headline: string | null
  target_companies: string[]
  budget_usd: number | null
  impressions: number
  clicks: number
  leads: number
  cost_usd: number
  agent_run_id: string | null
  created_at: string
  updated_at: string
}

export interface KpiSnapshot {
  id: string
  snapshot_date: string
  total_accounts: number
  tier1_accounts: number
  pipeline_accounts: number
  avg_icp_score: number
  avg_engagement_score: number
  briefs_approved: number
  briefs_total: number
  plays_activated: number
  signals_unprocessed: number
  agent_runs_today: number
  linkedin_impressions_total: number
  linkedin_clicks_total: number
  created_at: string
}

export interface AppSettings {
  id: 1
  // LinkedIn
  linkedin_access_token: string | null
  linkedin_refresh_token: string | null
  linkedin_token_expires_at: string | null
  linkedin_org_id: string | null
  linkedin_granted_scopes: string | null
  linkedin_ads_scope_ok: boolean | null
  linkedin_last_sync_at: string | null
  linkedin_last_sync_error: string | null
  // Salesforce
  salesforce_instance_url: string | null
  salesforce_access_token: string | null
  salesforce_refresh_token: string | null
  salesforce_token_expires_at: string | null
  salesforce_identity: string | null
  salesforce_last_sync_at: string | null
  salesforce_last_sync_error: string | null
  // ZoomInfo
  zoominfo_username: string | null
  zoominfo_client_id: string | null
  zoominfo_private_key: string | null
  zoominfo_access_token: string | null
  zoominfo_token_expires_at: string | null
  zoominfo_last_sync_at: string | null
  zoominfo_last_sync_error: string | null
  updated_at: string
}

// Custom play — per-account ad-hoc play the AE writes themselves, stored
// alongside the global PLAY_LIBRARY templates in lib/play-library.ts.
// Same shape as the library Play interface so PlayRecommender can render
// library + custom plays in one grid with no conditional rendering.
export type PlayType = 'outbound' | 'inbound' | 'event' | 'exec' | 'demo' | 'cs_expansion' | 'content'

export interface CustomPlay {
  id: string
  account_id: string
  name: string
  description: string
  play_type: PlayType
  owner_team: TeamType
  duration_days: number
  assets: string[]
  sample_outreach_opener: string
  expected_outcome: string
  created_by_name: string | null
  created_by_role: string | null
  created_at: string
  updated_at: string
}

export interface SalesforceOpportunity {
  id: string
  account_id: string | null
  sf_opportunity_id: string
  name: string | null
  stage_name: string | null
  amount: number | null
  close_date: string | null
  probability: number | null
  owner_name: string | null
  last_modified_at: string | null
  synced_at: string
}

export interface Database {
  public: {
    Tables: {
      accounts: { Row: Account; Insert: Omit<Account, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Account> }
      contacts: { Row: Contact; Insert: Omit<Contact, 'id' | 'created_at'>; Update: Partial<Contact> }
      signals: { Row: Signal; Insert: Omit<Signal, 'id' | 'created_at'>; Update: Partial<Signal> }
      positioning_briefs: { Row: PositioningBrief; Insert: Omit<PositioningBrief, 'id'>; Update: Partial<PositioningBrief> }
      account_actions: { Row: AccountAction; Insert: Omit<AccountAction, 'id' | 'created_at'>; Update: Partial<AccountAction> }
    }
  }
}
