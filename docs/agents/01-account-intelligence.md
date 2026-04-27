# Account Intelligence

> *The analyst.* · **Pipeline step 1 of 5**

## Purpose

Every other agent in the pipeline depends on a coherent read of the account. Account Intelligence is the one that reads everything we know — firmographics, the buying group, every signal, every touchpoint logged in the last 30 days — and writes a synthesis the rest of the pipeline grounds on. It also re-scores ICP / intent / engagement when the evidence supports it, and it writes a new signal if it spots a silent gap (an untouched VP-level contact, a stale lifecycle stage, an ignored intent spike). Without this step, downstream agents work from raw rows; with it, they work from understood state.

## What it does

> *"I read everything about one account — the firmographics, the buying-group contacts, every signal and every touchpoint logged in the last 30 days — and I write a synthesis that tells you what's actually going on. I also update the intent and engagement scores when the evidence supports it, and I write a new signal if I spot a gap (like 'no one from Sales has touched VP Quality in 47 days')."*

## When to use it

- You need a one-page situation report on a specific account before a call.
- Intent / engagement scores feel stale and you want them re-scored against fresh data.
- You suspect there's a silent problem — untouched contacts, missed signal — and want it surfaced.

## Tools

| Tool | What it does |
|---|---|
| `get_account` | Read the full account record (firmographics, scores, lifecycle). |
| `get_contacts` | Read the buying group — names, persona types, pain points. |
| `get_signals` | Read recent signals (intent, news, firmographic, product usage). |
| `get_account_actions` | Read recent touchpoints across Marketing, Sales, CS. |
| `update_account_scores` | Write back updated intent + engagement scores. |
| `create_signal` | Write a new synthesized signal when a gap is identified. |

## Where the output appears

- **Account detail header** — firmographics tile + score circles.
- **Signals tab** — synthesized engagement-gap signals show up here with the agent's reasoning.

## In the pipeline

- **Before:** nothing — Account Intelligence runs first.
- **After:** [Contact Research](02-contact-research.md) uses the synthesized state to decide which buying-group slot to fill next.

The intelligence summary is also passed through to Positioning and Play Orchestrator as `intelligence_summary` context, so the brief and plays inherit the analysis without re-reading every signal.

## Implementation

- **Source:** [`lib/agents/AccountIntelligenceAgent.ts`](../../lib/agents/AccountIntelligenceAgent.ts)
- **Model:** `claude-opus-4-6`, `max_tokens: 2048`
- **Shared rules:** [`lib/agents/content-rules.ts`](../../lib/agents/content-rules.ts) — verified roster, account-name precision, zero-fabrication contract.
- **Output schema:** JSON with `account_name`, `intelligence_summary`, `top_buying_signals`, `urgency`, `urgency_reason`, `recommended_next_action`, `maturity_assessment`, `updated_intent_score`, `updated_engagement_score`.
