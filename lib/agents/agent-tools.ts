import { getSupabase } from '@/lib/supabase'
import { getRecommendedPlays } from '@/lib/play-library'
import {
  SYSTEM_PROMPT_BASE,
  VERTICAL_CONTEXT,
  GEOGRAPHY_CONTEXT,
  MATURITY_CONTEXT,
} from '@/lib/positioning-kernel'
import { getProofPointsForAccount } from '@/lib/proof-points'
import type { IndustryVertical, Geography, LifecycleStage } from '@/lib/database.types'

const db = () => getSupabase()

// ── Account tools ──────────────────────────────────────────────────────────

export async function tool_get_account(account_id: string) {
  const { data, error } = await db().from('accounts').select('*').eq('id', account_id).single()
  if (error) throw new Error(`get_account failed: ${error.message}`)
  return data
}

export async function tool_get_contacts(account_id: string) {
  const { data } = await db().from('contacts').select('*').eq('account_id', account_id).order('created_at')
  return data ?? []
}

export async function tool_get_signals(account_id: string, limit = 15) {
  const { data } = await db()
    .from('signals')
    .select('*')
    .eq('account_id', account_id)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function tool_get_account_actions(account_id: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data } = await db()
    .from('account_actions')
    .select('*')
    .eq('account_id', account_id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function tool_get_positioning_brief(account_id: string) {
  const { data } = await db()
    .from('positioning_briefs')
    .select('*')
    .eq('account_id', account_id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

export async function tool_update_account_scores(account_id: string, intent_score: number, engagement_score: number) {
  const { error } = await db()
    .from('accounts')
    .update({ intent_score, engagement_score, updated_at: new Date().toISOString() })
    .eq('id', account_id)
  if (error) throw new Error(`update_account_scores failed: ${error.message}`)
  return { updated: true, intent_score, engagement_score }
}

export async function tool_create_signal(account_id: string, signal_type: string, source: string, content: string, sentiment: string) {
  const { data, error } = await db()
    .from('signals')
    .insert({ account_id, signal_type, source, content, sentiment, processed: false })
    .select()
    .single()
  if (error) throw new Error(`create_signal failed: ${error.message}`)
  return data
}

export async function tool_save_positioning_brief(
  account_id: string,
  core_message: string,
  persona_messages: Record<string, string>,
  proof_points: string[],
  objection_handlers: Array<{ objection: string; response: string }>,
  recommended_tone: string,
  key_themes: string[],
  positioning_statement: {
    for: string
    category: string
    key_benefit: string
    unlike: string
    because: string
  } | null = null
) {
  const { data, error } = await db()
    .from('positioning_briefs')
    .insert({
      account_id,
      core_message,
      persona_messages,
      proof_points,
      objection_handlers,
      recommended_tone,
      key_themes,
      positioning_statement,
      approved: false,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw new Error(`save_positioning_brief failed: ${error.message}`)
  return data
}

export async function tool_get_positioning_kernel(
  industry_vertical: IndustryVertical,
  geography: Geography,
  digital_maturity: number
) {
  return {
    system_prompt_base: SYSTEM_PROMPT_BASE,
    vertical_context: VERTICAL_CONTEXT[industry_vertical] ?? null,
    geography_context: GEOGRAPHY_CONTEXT[geography] ?? null,
    maturity_context: MATURITY_CONTEXT[digital_maturity] ?? null,
  }
}

export async function tool_get_proof_points(industry_vertical: IndustryVertical, count = 3) {
  return getProofPointsForAccount(industry_vertical, count)
}

export async function tool_get_recommended_plays(
  lifecycle_stage: LifecycleStage,
  industry_vertical: IndustryVertical,
  geography: Geography,
  digital_maturity: number,
  tier: number
) {
  return getRecommendedPlays({ lifecycle_stage, industry_vertical, geography, digital_maturity, tier })
}

export async function tool_create_account_action(
  account_id: string,
  action_type: string,
  performed_by: string,
  team: string,
  contact_name: string | null,
  notes: string
) {
  const { data, error } = await db()
    .from('account_actions')
    .insert({ account_id, action_type, performed_by, team, contact_name, notes, outcome: 'pending' })
    .select()
    .single()
  if (error) throw new Error(`create_account_action failed: ${error.message}`)
  return data
}

// ── Signal watch tools ─────────────────────────────────────────────────────

export async function tool_list_accounts_with_signals() {
  const { data: accounts } = await db().from('accounts').select('*').order('tier').order('icp_fit_score', { ascending: false })
  const { data: signals } = await db().from('signals').select('account_id').eq('processed', false)

  const signalCounts: Record<string, number> = {}
  for (const s of signals ?? []) {
    signalCounts[s.account_id] = (signalCounts[s.account_id] ?? 0) + 1
  }

  return (accounts ?? []).map(a => ({
    ...a,
    unprocessed_signals: signalCounts[a.id] ?? 0,
  }))
}

export async function tool_get_unprocessed_signals(limit = 50) {
  const { data } = await db()
    .from('signals')
    .select('*, accounts(name, industry_vertical, tier)')
    .eq('processed', false)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function tool_mark_signal_processed(signal_ids: string[]) {
  const { error } = await db().from('signals').update({ processed: true }).in('id', signal_ids)
  if (error) throw new Error(`mark_signal_processed failed: ${error.message}`)
  return { updated: signal_ids.length }
}

export async function tool_update_account_intent_score(account_id: string, intent_score: number) {
  const { error } = await db().from('accounts').update({ intent_score, updated_at: new Date().toISOString() }).eq('id', account_id)
  if (error) throw new Error(`update_account_intent_score failed: ${error.message}`)
  return { updated: true, intent_score }
}

// ── LinkedIn tools ─────────────────────────────────────────────────────────

export async function tool_save_linkedin_campaign_draft(
  account_id: string,
  campaign_name: string,
  headline: string,
  ad_copy: string,
  target_companies: string[],
  agent_run_id: string | null
) {
  const { data, error } = await db()
    .from('linkedin_campaigns')
    .insert({
      account_id,
      campaign_name,
      headline,
      ad_copy,
      target_companies,
      status: 'draft',
      agent_run_id,
    })
    .select()
    .single()
  if (error) throw new Error(`save_linkedin_campaign_draft failed: ${error.message}`)
  return data
}

// ── Agent run management ───────────────────────────────────────────────────

export async function createAgentRun(
  agent_name: string,
  account_id: string | null,
  input_summary: string,
  trigger_source = 'manual'
) {
  const { data, error } = await db()
    .from('agent_runs')
    .insert({
      agent_name,
      account_id,
      input_summary,
      trigger_source,
      status: 'running',
      steps: [],
      model: 'claude-opus-4-6',
    })
    .select()
    .single()
  if (error) throw new Error(`createAgentRun failed: ${error.message}`)
  return data
}

export async function appendAgentStep(run_id: string, step: object) {
  const { data: current } = await db().from('agent_runs').select('steps').eq('id', run_id).single()
  const steps = Array.isArray(current?.steps) ? current.steps : []
  steps.push(step)
  await db().from('agent_runs').update({ steps }).eq('id', run_id)
}

export async function completeAgentRun(run_id: string, output_summary: string, started_at: string) {
  const duration_ms = Date.now() - new Date(started_at).getTime()
  await db().from('agent_runs').update({
    status: 'completed',
    output_summary,
    duration_ms,
    completed_at: new Date().toISOString(),
  }).eq('id', run_id)
}

export async function failAgentRun(run_id: string, error_message: string, started_at: string) {
  const duration_ms = Date.now() - new Date(started_at).getTime()
  await db().from('agent_runs').update({
    status: 'failed',
    error_message,
    duration_ms,
    completed_at: new Date().toISOString(),
  }).eq('id', run_id)
}
