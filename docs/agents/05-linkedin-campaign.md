# LinkedIn Campaign

> *The campaign writer.* · **Pipeline step 5 of 5**

## Purpose

The previous four agents collaborate to produce a strategic foundation for one account: who they are, who matters, what they need to hear, what plays to run. The LinkedIn Campaign agent translates that foundation into **paid distribution** — a Sponsored Content campaign anchored in the approved positioning brief, drafted as a campaign in LinkedIn Campaign Manager and saved as a draft (never auto-launched). A human on the marketing team reviews, sets the budget, picks the audience, and clicks publish.

The agent's defining constraint: it does not generate ad copy from scratch. It reads the [approved brief](03-positioning.md) and uses the brief's category phrase, key themes, and proof points to write a 100-character headline + 600-character body. The result: ad copy that the AE could quote in a discovery call without contradiction. **Strategy and ads stay aligned.**

## What it does

> *"I draft a LinkedIn Sponsored Content campaign anchored in the account's approved positioning brief — headline under 100 characters, body copy under 600, observational tone, zero vendor snark. I save it as a draft in LinkedIn Campaign Manager (never auto-launch). You review, polish if needed, pick a budget, and publish from LinkedIn itself."*

## When to use it

- The positioning brief is approved and you want to stand up a LinkedIn campaign for this account.
- You need a second creative variant tailored to a different buying-group persona.
- A campaign went live and you want a follow-up draft ready for the next flight.

## Tools

| Tool | What it does |
|---|---|
| `get_account` | Read the account record — name, vertical, geography. |
| `get_contacts` | Read the buying group so the ad targets the right persona. |
| `get_positioning_brief` | Read the approved brief — the source of truth for the ad's strategic anchor. |
| `save_linkedin_campaign` | Save a draft Sponsored Content campaign. If LinkedIn API credentials are present, also creates a real DRAFT in Campaign Manager via the Marketing API. |

## Where the output appears

- **Campaigns tab** on the account detail page — the draft card with headline, ad copy, and KPI panel below (CTR, CPC, CPM, Engagements, Engagement Rate).
- **Mission Control LinkedIn panel** — every campaign card lives here too, sorted by pin status.

## In the pipeline

- **Before:** [Positioning](03-positioning.md) — the LinkedIn agent's prompt explicitly requires it to anchor headline + ad copy in the brief's category phrase and strategic pillars. No brief, no campaign.
- **After:** nothing — campaign is the last per-account agent.

## Hard constraints baked into the prompt

- **Tulip IS the composable MES.** Forbidden framings include "sits on top of MES," "layers above ERP," "complements MES" — the same constraint as the brief, enforced again at the ad copy level.
- **Observational tone, never judgmental.** The prompt explicitly bans snarky framings ("That math doesn't work," "Why Bayer is behind"). Headlines that punch down at the prospect are treated as automatic fails — they're the single biggest reason enterprise B2B ads flop.
- **Specific account fact required.** Every headline must include a real plant name, regulatory deadline, M&A move, named contact, or product launch — pulled from the brief or signals, not invented.
- **Always saved as DRAFT.** The agent cannot auto-publish. Marketing reviews and clicks publish from LinkedIn Campaign Manager.

## A real campaign that ran

A Sponsored Content campaign for Bayer AG was drafted by this agent, reviewed by a human, and published to LinkedIn against a narrow ABM audience — Bayer employees in Germany, English-speaking, in 17 specific senior Quality and Manufacturing IT titles. Performance numbers ingest via CSV import from LinkedIn Campaign Manager; live Marketing API sync activates on Tulip credentials.

## Implementation

- **Source:** [`lib/agents/LinkedInOutreachAgent.ts`](../../lib/agents/LinkedInOutreachAgent.ts) (class kept for DB compatibility — display name is "LinkedIn Campaign").
- **Display metadata:** [`lib/agents/agent-metadata.tsx`](../../lib/agents/agent-metadata.tsx).
- **LinkedIn integration:** [`app/api/linkedin/`](../../app/api/linkedin/) — OAuth callback, campaign sync, CSV import, Conversions API.
- **UI panel:** [`components/MissionControl/LinkedInPanel.tsx`](../../components/MissionControl/LinkedInPanel.tsx).
- **Model:** `claude-opus-4-6`, `max_tokens: 2000`.
