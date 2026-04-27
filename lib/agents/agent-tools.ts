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
import { validateWebFinding } from './web-validation'

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


// ── Web research tools (used by AccountIntelligenceAgent when WEB_RESEARCH_ENABLED) ──

// Fetch a URL and return up to 60 KB of plain text. The agent calls this
// after web_search to read a full page and extract a verbatim quote that
// will pass cite_web_finding validation. Caps the response so a single
// huge page can't blow the context window.
export async function tool_fetch_url(url: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, error: `Malformed URL: ${url}` }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: `Unsupported protocol: ${parsed.protocol}` }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' })
    if (res.status < 200 || res.status >= 400) {
      return { ok: false, error: `HTTP ${res.status} fetching ${url}` }
    }
    const ct = (res.headers.get('content-type') ?? '').toLowerCase()
    if (!ct.includes('text/') && !ct.includes('application/xhtml')) {
      return { ok: false, error: `Content-type "${ct}" is not text — cannot extract a quote.` }
    }
    const html = await res.text()
    // Strip scripts/styles, then tags, decode entities, normalize whitespace.
    // The agent reads the result, finds a quote that backs its claim, and
    // passes that quote to cite_web_finding which re-fetches and validates.
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
    const MAX_TEXT_CHARS = 60_000
    return {
      ok: true,
      url,
      content_type: ct,
      text: text.slice(0, MAX_TEXT_CHARS),
      truncated: text.length > MAX_TEXT_CHARS,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Fetch failed: ${msg}` }
  } finally {
    clearTimeout(timer)
  }
}

// Cite a web-sourced finding. The agent calls this with a structured claim,
// the source URL, and the EXACT quote it pulled from that URL. We validate
// the URL is reachable AND the quote literally exists in the page text. If
// validation passes, we write a row to the signals table with the citation
// embedded in the content + source fields. If validation fails, the call
// returns an error — the agent can try a different source or skip the claim.
//
// Categories:
//   firmographic   — employee count, revenue, plant footprint, leadership
//   news           — press release, M&A, product launch, executive change
//   regulatory     — FDA / EMA / SEC actions, deadlines, settlements
//   intent_signal  — job postings, capex announcements, RFPs, public statements
//   product_usage  — quoted statements about systems they use today
export async function tool_cite_web_finding(
  account_id: string,
  claim: string,
  source_url: string,
  exact_quote_from_source: string,
  category: string,
  confidence: number,
) {
  const validation = await validateWebFinding(source_url, exact_quote_from_source)
  if (!validation.ok) {
    return { ok: false, error: `Citation rejected: ${validation.reason}`, finding_saved: false }
  }
  const signal_type =
    category === "news" ? "news" :
    category === "regulatory" ? "news" :
    category === "intent_signal" ? "intent" :
    category === "product_usage" ? "product_usage" :
    "firmographic"
  // Embed the cited quote in the content field so the UI renders the receipt
  // alongside the headline. UI parses on " — Source: " to split out the quote.
  const content = `${claim}\n\nSource quote: "${exact_quote_from_source}"`
  const { data, error } = await db().from("signals").insert({
    account_id,
    signal_type,
    source: source_url,
    content,
    sentiment: "neutral",
    processed: false,
  }).select().single()
  if (error) {
    return { ok: false, error: `signal write failed: ${error.message}`, finding_saved: false }
  }
  return { ok: true, signal_id: data.id, finding_saved: true, validated_url: source_url, confidence }
}

// Update one or more firmographic fields on the account. Confidence MUST be
// >= 0.85 and a corresponding cited finding (with a real source URL) MUST
// have been written first. The agent supplies cited_signal_id from a prior
// tool_cite_web_finding call as proof.
const FIRMO_CONFIDENCE_THRESHOLD = 0.85

export async function tool_update_account_firmographics(
  account_id: string,
  cited_signal_id: string,
  confidence: number,
  patch: { description?: string; employee_count?: number; revenue_estimate?: number },
) {
  if (confidence < FIRMO_CONFIDENCE_THRESHOLD) {
    return { ok: false, error: `Confidence ${confidence} below threshold ${FIRMO_CONFIDENCE_THRESHOLD} — refusing to update firmographics. Write a signal instead.`, applied: false }
  }
  const { data: signal } = await db().from("signals").select("id, account_id, source").eq("id", cited_signal_id).single()
  if (!signal) {
    return { ok: false, error: `cited_signal_id ${cited_signal_id} not found — every firmographic update must reference a previously-saved web finding.`, applied: false }
  }
  if (signal.account_id !== account_id) {
    return { ok: false, error: `cited_signal_id is for a different account — refusing cross-account write.`, applied: false }
  }
  if (!signal.source || !signal.source.startsWith("http")) {
    return { ok: false, error: `cited signal has no http source URL — refusing to write firmographic update from an unsourced finding.`, applied: false }
  }
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof patch.description === "string" && patch.description.trim()) update.description = patch.description.trim()
  if (typeof patch.employee_count === "number" && Number.isFinite(patch.employee_count)) update.employee_count = Math.round(patch.employee_count)
  if (typeof patch.revenue_estimate === "number" && Number.isFinite(patch.revenue_estimate)) update.revenue_estimate = Math.round(patch.revenue_estimate)
  if (Object.keys(update).length <= 1) {
    return { ok: false, error: `patch contained no valid firmographic fields.`, applied: false }
  }
  const { error } = await db().from("accounts").update(update).eq("id", account_id)
  if (error) return { ok: false, error: `accounts update failed: ${error.message}`, applied: false }
  return { ok: true, applied: true, updated_fields: Object.keys(update).filter(k => k !== "updated_at"), via_signal: cited_signal_id, source_url: signal.source }
}

