# Account Intelligence

> *The analyst.* · **Pipeline step 1 of 5**

## Purpose

Every other agent in the pipeline depends on a coherent read of the account. Account Intelligence is the one that reads everything we know — firmographics, the buying group, every signal, every touchpoint logged in the last 30 days — **and researches the public web for fresh firmographic updates, news, regulatory events, and intent signals**. It writes a synthesis the rest of the pipeline grounds on. It also re-scores ICP / intent / engagement when the evidence supports it, and writes a new signal if it spots a silent gap (an untouched VP-level contact, a stale lifecycle stage, an ignored intent spike). Without this step, downstream agents work from raw rows; with it, they work from understood, fresh state.

## What it does

> *"I read everything on file about one account — firmographics, the buying group, every signal, every touchpoint in the last 30 days — and I research the public web for fresh firmographic updates, news, regulatory events, and intent signals. Every web finding I save carries a real source URL and a verbatim quote from that source; the orchestrator validates both before the row hits the database. I update intent + engagement scores when the evidence supports it, and I write a new signal if I spot a gap (like 'no one from Sales has touched VP Quality in 47 days')."*

## When to use it

- You want a fresh batch of cited signals — news, regulatory events, intent signals — to land on the Signals tab.
- Intent / engagement scores feel stale and you want them re-scored against fresh data.
- You suspect there's a silent problem — untouched contacts, missed signal — and want it surfaced.
- Firmographics on file feel out of date and you want a sourced refresh from the public web.

## Tools

| Tool | What it does |
|---|---|
| `get_account` | Read the full account record (firmographics, scores, lifecycle). |
| `get_contacts` | Read the buying group — names, persona types, pain points. |
| `get_signals` | Read recent signals (intent, news, firmographic, product usage). |
| `get_account_actions` | Read recent touchpoints across Marketing, Sales, CS. |
| `web_search` | Anthropic server-side web search. Finds public URLs relevant to the account. |
| `fetch_url` | Fetch a URL's full text (HTML stripped, ≤60KB). Used to extract a verbatim quote that will pass cite-finding validation. |
| `cite_web_finding` | Save a web-sourced finding with a real `source_url` + `exact_quote_from_source`. Validation is mechanical (see below). |
| `update_account_firmographics` | Write back to `accounts.description` / `employee_count` / `revenue_estimate`. Only fires when confidence ≥ 0.85 AND a previously-saved cited finding backs the update. |
| `update_account_scores` | Write back updated intent + engagement scores. |
| `create_signal` | Write a new agent-synthesized signal (e.g. an engagement-gap signal) with `source = "AccountIntelligenceAgent"`. |

## How web sources are validated

Fabrication is prevented mechanically, not just by prompt. Every call to `cite_web_finding` runs through [`lib/agents/web-validation.ts`](../../lib/agents/web-validation.ts):

1. **URL shape check** — must be valid http or https.
2. **URL reachability** — HEAD request (falls back to GET if HEAD is refused). Must return 2xx or 3xx within 8 seconds.
3. **Quote substring check** — fetches the page text, strips HTML, normalizes whitespace + smart quotes, and verifies that `exact_quote_from_source` literally appears in the page. Case-insensitive, but otherwise verbatim.

If any check fails, the finding is rejected with a specific reason ("URL returned HTTP 404", "Quote not found at URL", etc.) and the agent receives that reason as its tool result. It can try a different source. **It cannot save a fact about an account without a passing citation.**

For `update_account_firmographics`, three additional checks run server-side: the cited signal must exist, must belong to the same account, and its `source` field must be a valid http URL. Confidence must be ≥ 0.85.

## Where the output appears

- **Account detail header** — firmographics tile + score circles.
- **Signals tab** — every cited finding renders as a clean signal card: the **claim as the headline**, a **"via {domain}"** tag (e.g. *via reuters.com*), and a **"↗ Source"** badge that opens the citation URL. The verbatim quote is used for validation only — it never pollutes the UI. PositioningAgent reads these signals to ground the brief, but the brief itself stays free of raw URLs and source-reference text.

## In the pipeline

- **Before:** nothing — Account Intelligence runs first.
- **After:** [Contact Research](02-contact-research.md) uses the synthesized state to decide which buying-group slot to fill next.

The intelligence summary is also passed through to Positioning and Play Orchestrator as `intelligence_summary` context, so the brief and plays inherit the analysis without re-reading every signal.

## Feature flag

Web research is opt-in via the `WEB_RESEARCH_ENABLED` environment variable in `.env.local`:

| `WEB_RESEARCH_ENABLED` | Behavior |
|---|---|
| Unset or `"false"` (default) | Agent runs in DB-only mode — `web_search`, `fetch_url`, `cite_web_finding`, `update_account_firmographics` tools are NOT registered. Original synthesis-only behavior. |
| `"true"` | Agent runs with full web research — every run searches the public web, cites findings with verifiable URL + quote, and writes back firmographic updates when confidence is high. |

Flag defaults to OFF so existing curated content survives. Flip it in `.env.local` when ready to let the agent refresh accounts from the live web.

## Implementation

- **Source:** [`lib/agents/AccountIntelligenceAgent.ts`](../../lib/agents/AccountIntelligenceAgent.ts)
- **Web validators:** [`lib/agents/web-validation.ts`](../../lib/agents/web-validation.ts) — URL + quote substring checks
- **Tool implementations:** [`lib/agents/agent-tools.ts`](../../lib/agents/agent-tools.ts) — `tool_fetch_url`, `tool_cite_web_finding`, `tool_update_account_firmographics`
- **Shared rules:** [`lib/agents/content-rules.ts`](../../lib/agents/content-rules.ts) — verified roster, account-name precision, zero-fabrication contract, web-research rules.
- **Model:** `claude-opus-4-6` · `max_tokens: 4096` (web mode) or `2048` (DB-only mode).
- **Output schema:** JSON with `account_name`, `intelligence_summary`, `top_buying_signals`, `urgency`, `urgency_reason`, `recommended_next_action`, `maturity_assessment`, `updated_intent_score`, `updated_engagement_score`.
