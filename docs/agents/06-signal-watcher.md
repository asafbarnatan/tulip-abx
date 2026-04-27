# Signal Watcher

> *The radar.* · **Portfolio sweep — runs separately from Full Pipeline**

## Purpose

Account Intelligence runs against **one** account when an AE clicks Run Pipeline. But on Monday morning a GTM team doesn't know which account to work first — that's a portfolio question. Signal Watcher answers it. It sweeps every account in the system in a single pass, ranks them critical / high / medium / low based on unprocessed signals (news, job postings, regulatory deadlines, intent spikes) plus how stale each account's signal queue has gotten, updates intent scores where the data supports it, marks signals as processed, and returns one honest line explaining why each account got its urgency level. **Output drives the Account Pulse colors on Mission Control** — the visual that tells the team where to spend their day.

This is the only agent that runs across the portfolio rather than per-account, which is why it lives in its own motion (the *Run Signal Watch* button in the Mission Control header) instead of inside Full Pipeline. It's also the cheapest agent to run frequently — most clicks don't change much, but when news breaks for a target vertical, this agent surfaces it before anyone reads their inbox.

## What it does

> *"I sweep every account every time you run me and rank them by urgency — critical, high, medium, low — based on unprocessed signals (news, job postings, regulatory deadlines) and how stale each one is. I update intent scores where the data supports it, mark signals as processed, and return one honest line explaining why each account got its urgency level. My output drives the Account Pulse colors on Mission Control."*

## When to use it

- Monday morning: you want to know which accounts to work first this week.
- A big news event broke for one of your target industries and you want to know if any accounts are suddenly hot.
- You just ingested a batch of new signals and want them triaged automatically.

## Tools

| Tool | What it does |
|---|---|
| `list_accounts_with_signals` | List every account with its unprocessed signal counts. |
| `get_unprocessed_signals` | Read the actual content of every unprocessed signal across all accounts. |
| `mark_signal_processed` | Mark signals as processed once the agent has weighed them. |
| `update_account_intent_score` | Update intent scores when the signal evidence supports it. |

## Where the output appears

- **Mission Control header** — the "Account Pulse" critical / high / medium / low colors per account.
- **Per-account intent score circles** — refreshed when this agent updates them.
- **Activity feed** — the urgency_reason for each account shows up as the SignalWatcher's run summary.

## Why it lives outside Full Pipeline

Full Pipeline is a per-account orchestration: each step depends on the one before, against one account. Signal Watcher's scope is the entire portfolio — it doesn't have a single account input. Embedding it inside the per-account flow would mean re-sweeping the whole portfolio every time an AE refreshes one account, which is wasteful. Keeping it separate also means the AE can click *Run Signal Watch* without overwriting any other agent's account-specific output.

## Hard constraint: zero invented intent vendors

The agent's prompt explicitly bans inventing intent-data vendor names. *"6sense intent spike," "Bombora research," "G2 research," "TechTarget intent," "ZoomInfo intent"* — none of these can appear in a signal's urgency_reason unless the source string literally appears in the underlying signals data. Same rule for competitor names and budget numbers. The urgency_reason is what shows on the CEO's Mission Control view; an invented detail there is the kind of credibility failure the platform is built to prevent.

## Implementation

- **Source:** [`lib/agents/SignalWatcherAgent.ts`](../../lib/agents/SignalWatcherAgent.ts)
- **Orchestrator entry:** [`lib/agents/orchestrator.ts`](../../lib/agents/orchestrator.ts) — `pipeline === 'signal-watch'` branch.
- **Trigger UI:** *Run Signal Watch* button in the Mission Control header, [`components/MissionControl/RunSignalWatchButton.tsx`](../../components/MissionControl/RunSignalWatchButton.tsx).
- **Shared rules:** [`lib/agents/content-rules.ts`](../../lib/agents/content-rules.ts) — verified roster + account-name precision (so the urgency_reason never describes Bayer or BSC as Tulip customers).
- **Model:** `claude-opus-4-6`, `max_tokens: 2048`.
- **Output:** JSON array of `{ account_id, account_name, urgency, urgency_reason, signals_count }` for **every** account in the system, ordered critical → low.
