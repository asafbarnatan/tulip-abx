# Play Orchestrator

> *The coordinator.* · **Pipeline step 4 of 5**

## Purpose

A positioning brief without concrete next moves is a slide deck nobody acts on. Play Orchestrator turns the brief into **3 specific, named-contact plays** the team can actually run tomorrow morning — each with a target person, a why-now grounded in the account's signals, a personalized opener the AE can copy-paste, and a strategic rationale for why this play, this account, this week. The agent picks plays from Tulip's curated [play library](../../lib/play-library.ts) that fit the account's lifecycle stage, vertical, geography, and digital maturity, and personalizes the opener copy using real names from the buying group. **It never executes anything** — every play is saved as a draft action that a human picks up and runs.

## What it does

> *"I pick 3 to 5 sales plays from the Tulip play library that fit this account's stage and vertical, personalize the opener copy for named contacts in the buying group, and save each play as a draft action with a clear why-now, target, opener, and rationale. I don't execute anything — a human on your team picks up each draft and runs it."*

## When to use it

- You just finished a brief and want a prioritized list of concrete next moves.
- An SDR needs openers ready to personalize before the day starts.
- You want to compare two accounts on what plays the library recommends for each.

## Tools

| Tool | What it does |
|---|---|
| `get_account` | Read the account — stage, vertical, maturity drive the play selection. |
| `get_contacts` | Read the buying group so the agent can target real names. |
| `get_recommended_plays` | Pull the top 3-5 plays from the library matching this account's profile. |
| `get_positioning_brief` | Read the approved brief so play copy aligns with strategic messaging. |
| `get_account_actions` | Read recent touchpoints so the agent doesn't recommend a play already in motion. |
| `create_account_action` | Save each play as a draft action with structured `notes` (play_name, target, why_now, opener, rationale). |

## Where the output appears

- **Recommended Plays tab** — one card per play with the why-now bullets, the personalized opener, and the strategic rationale.
- **Actions tab** — each draft play also lands here as a pending action with full structured notes; an AE can promote it to "in progress," "completed," "stage_advanced," etc.

## In the pipeline

- **Before:** [Positioning](03-positioning.md) — Play Orchestrator reads the approved brief so opener copy lines up with key themes and persona messages.
- **After:** [LinkedIn Campaign](05-linkedin-campaign.md) — the campaign agent draws on the same brief to author Sponsored Content. Plays are 1:1 outreach, the campaign is 1:many. Both anchored to the same strategy.

## Structured notes format

The `notes` field on each saved action is a JSON string the UI parses literally:

```json
{
  "play_name": "Champion Thread — AI-Ready Plant-Floor Data Layer",
  "target": "Ryan Snyder, SVP and Chief Information Officer",
  "why_now": [
    "Three-pillar AI strategy publicly announced at CPHI Frankfurt 2025.",
    "Zero logged Tulip touchpoints in 90 days.",
    "Rockwell Automation actively competing with a 60-90 day decision window."
  ],
  "opener": "Ryan — your OpenAI collaboration caught my attention because…",
  "rationale": [
    "Ryan is the identified Champion and the executive most aligned with Tulip's vision.",
    "Opening a champion thread first creates an internal advocate.",
    "Leading with the AI data-connectivity angle differentiates Tulip from Rockwell Plex."
  ]
}
```

The split between `opener` (customer-facing, second-person) and `why_now` / `rationale` (internal, third-person) is enforced in the prompt — opener copy uses "you" / "your," the rest refers to the contact in third person.

## Implementation

- **Source:** [`lib/agents/PlayOrchestratorAgent.ts`](../../lib/agents/PlayOrchestratorAgent.ts)
- **Play library:** [`lib/play-library.ts`](../../lib/play-library.ts) — curated, deterministic. The agent picks from this list; it does not invent new plays.
- **Shared rules:** [`lib/agents/content-rules.ts`](../../lib/agents/content-rules.ts) — same zero-fabrication contract as Positioning.
- **UI rendering:** [`components/PlayRecommender.tsx`](../../components/PlayRecommender.tsx) parses the structured notes JSON and renders the rich card.
- **Model:** `claude-opus-4-6`, `max_tokens: 2500`.
