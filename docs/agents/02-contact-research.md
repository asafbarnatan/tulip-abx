# Contact Research

> *The scout.* · **Pipeline step 2 of 5**

## Purpose

The brief is only as good as the buying group it speaks to. If Bayer's account has no Champion, no Economic Buyer, and no Technical Evaluator on file, then Positioning has no one to write a persona message for and Play Orchestrator has no one to target. Contact Research fixes that — it finds **real, publicly verifiable** people for empty buying-group slots and refuses to invent. Every contact comes back with a cited source URL (LinkedIn profile, press release, company page) and a direct quote from that source as evidence. If the web doesn't confirm a credible answer for a role, the agent returns nothing rather than fabricate.

## What it does

> *"I find real, publicly verifiable people at target accounts for empty buying-group slots — and I refuse to invent. For each proposed contact I cite a real URL (LinkedIn profile, company website, press release) and a direct quote from that source as evidence. If the web doesn't show a credible answer for the role, I return nothing rather than guess."*

In Full Pipeline runs, the orchestrator picks the highest-priority empty slot (Champion → Economic Buyer → Technical Evaluator, in that order) and asks Contact Research to fill that one. AEs who want to fill more than one slot at a time can run the standalone *Contact Research* pipeline.

## When to use it

- The buying group has an empty slot (e.g. "VP Quality") and you need a real candidate with a source.
- A known contact left the account and you need to find their replacement.
- You want a second opinion on whether a sourced contact is actually the right level for the role.

## Tools

| Tool | What it does |
|---|---|
| `get_account` | Read the account record — name, vertical, geography, plant footprint. |
| `web_search` | Live web search via the Anthropic SDK. |
| `propose_contact` | Save a proposed contact with a cited source URL, an evidence quote, and a confidence rating. |

## Where the output appears

- **Buying Group tab** — proposed contacts show up as new cards with their persona type, title, source link, and the evidence quote that justified the addition.
- AEs can accept, edit, or remove the proposed contact before it becomes a permanent part of the buying group.

## In the pipeline

- **Before:** [Account Intelligence](01-account-intelligence.md) — Contact Research uses the synthesis + the current buying group state to decide what's missing.
- **After:** [Positioning](03-positioning.md) — the brief's persona messages can now address a real Champion, Economic Buyer, etc.

The orchestrator's per-pipeline guard checks for empty slots first; if Champion + Economic Buyer + Technical Evaluator are all populated, Contact Research is skipped with a clear reason in the activity feed.

## Implementation

- **Source:** [`lib/agents/ContactResearchAgent.ts`](../../lib/agents/ContactResearchAgent.ts)
- **Orchestrator gate:** [`lib/agents/orchestrator.ts`](../../lib/agents/orchestrator.ts) (`findFirstEmptyPersonaSlot`)
- **Model:** `claude-opus-4-6`, web-search enabled.
- **Persona types accepted:** `Champion`, `Economic Buyer`, `Technical Evaluator`, `End User`, `Blocker`.
- **Output schema:** JSON candidate with `name`, `title`, `persona_type`, `source_url`, `evidence_quote`, `confidence`, `inferred_pain_points`, `reasoning`.
