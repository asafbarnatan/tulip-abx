# Positioning

> *The strategist.* · **Pipeline step 3 of 5**

## Purpose

Generic positioning loses enterprise deals. Bayer is not Daikin is not RTX — vertical, geography, regulatory regime, digital maturity, and buying group all change what Tulip should say. The Positioning agent generates a complete strategic brief in [April Dunford's framework](https://aprildunford.com) (For / Category / Key Benefit / Unlike / Because) tailored to one specific account, grounded in the account's vertical, geography, digital maturity, recent signals, and any intelligence the previous agents passed forward. Output: positioning statement, strategic narrative (WHY NOW + THE PLAY), three strategic pillars, persona-specific messages for every contact in the buying group, verified Tulip proof points, objection handlers, and a recommended tone register.

This is the most-consumed surface on the platform. Marketing reads the brief to write campaigns. AEs read it before discovery calls. CS reads it to understand what was promised. Renewals reads it to remember why this account chose Tulip. **One brief, every function aligned.**

## What it does

> *"I write the strategic message for how Tulip wins this specific account. Using the April Dunford framework (For / Category / Key Benefit / Unlike / Because), I produce a full positioning brief: strategic narrative, three strategic pillars, a tailored message per buying-group persona, relevant proof points from Tulip's real customer stories, and objection handlers. Grounded in the account's vertical, geography, digital maturity, and any intelligence from prior agent runs."*

## When to use it

- You're about to draft a cold email, LinkedIn InMail, or meeting agenda and need the strategic message.
- The positioning on an account feels generic and you want something tailored to their specific moment.
- A new buying-group contact got added and you need a fresh persona-specific message for them.

## Tools

| Tool | What it does |
|---|---|
| `get_account` | Read the account record. |
| `get_contacts` | Read the buying group — needed for per-persona messages. |
| `get_signals` | Read recent signals to ground the brief in real account state. |
| `get_positioning_kernel` | Load Tulip's positioning context for this vertical × geography × digital maturity. |
| `get_proof_points` | Pull verified Tulip case studies and metrics relevant to this vertical. |
| `save_positioning_brief` | Persist the brief — every field is human-editable inline after save. |

## Where the output appears

- **Positioning Brief tab** on the account detail page. Eight sections: Positioning Statement, Strategic Narrative, Strategic Pillars, Persona Messages, Proof Points, Objection Handlers, Recommended Tone, Edit button.
- The brief is **the source of truth** that the LinkedIn Campaign agent reads when drafting ad copy in the next step.

## In the pipeline

- **Before:** [Contact Research](02-contact-research.md) — by the time Positioning runs, the buying group has a Champion, an Economic Buyer, and a Technical Evaluator, so persona messages can address real people.
- **After:** [Play Orchestrator](04-play-orchestrator.md) reads the brief to anchor the recommended plays in approved messaging.

## How content stays accurate

The Positioning agent's prompt is the longest in the platform — and the most opinionated. It enforces:

- **Tulip IS the MES, not a layer above it.** Forbidden framings that position Tulip as additive are explicitly listed in the prompt. (Caught one DePuy Synthes fabrication in early review — full guardrails applied since.)
- **Customer-naming hard rule.** Only names from the [verified Tulip roster](../../lib/agents/content-rules.ts) can appear. Every other framing falls back to anonymized phrasing ("A Fortune 500 medical device manufacturer…").
- **No fabricated metrics.** Every number must be quotable from a tool call result. Qualitative language is preferred over invented precision.
- **No editorial brackets in saved output.** `[CUSTOMER NAME REQUIRED]`, `[SOFT — needs verification]` etc. are caught and rewritten before save.

## Implementation

- **Source:** [`lib/agents/PositioningAgent.ts`](../../lib/agents/PositioningAgent.ts)
- **Editable UI:** [`components/PositioningBriefTab.tsx`](../../components/PositioningBriefTab.tsx) + [`components/BriefEditor/`](../../components/BriefEditor/)
- **Shared rules:** [`lib/agents/content-rules.ts`](../../lib/agents/content-rules.ts)
- **Model:** `claude-opus-4-6`, `max_tokens: 3000` (the longest budget of any agent — briefs are dense).
- **Output schema:** JSONB columns on `positioning_briefs` — `positioning_statement`, `core_message`, `key_themes`, `persona_messages`, `proof_points`, `objection_handlers`, `recommended_tone`.
