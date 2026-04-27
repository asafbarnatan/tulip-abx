# Agents

Six Claude Opus 4.6 agents power the Tulip ABX platform. They run in two distinct motions:

- **Per-Account Pipeline (5 agents)** — fire in dependency-correct order against one account when an AE clicks **Run Pipeline** on Mission Control. Each agent's output feeds the next.
- **Portfolio Sweep (1 agent)** — sweeps every account in one pass when an AE clicks **Run Signal Watch**. Ranks the portfolio by urgency.

Every agent shares the same content-quality contract via [`lib/agents/content-rules.ts`](../../lib/agents/content-rules.ts) — verified Tulip customer roster, banned framings, real Tulip AI feature names, account-name precision, zero-fabrication rules. Edit one file, every agent inherits.

---

## Per-Account Pipeline

| # | Agent | Tagline | Output renders in |
|---|---|---|---|
| 1 | [Account Intelligence](01-account-intelligence.md) | The analyst | Account header (firmographics, scores) + Signals tab |
| 2 | [Contact Research](02-contact-research.md) | The scout | Buying Group tab |
| 3 | [Positioning](03-positioning.md) | The strategist | Positioning Brief tab |
| 4 | [Play Orchestrator](04-play-orchestrator.md) | The coordinator | Recommended Plays + Actions tabs |
| 5 | [LinkedIn Campaign](05-linkedin-campaign.md) | The campaign writer | Campaigns tab + Mission Control LinkedIn panel |

## Portfolio Sweep

| Agent | Tagline | Output renders in |
|---|---|---|
| [Signal Watcher](06-signal-watcher.md) | The radar | Mission Control Account Pulse + intent scores |

---

## How to read these docs

Each agent doc has the same structure:

- **Purpose** — why the agent exists, what gap it fills.
- **What it does** — the first-person description an AE sees on the Agents page.
- **When to use it** — concrete scenarios.
- **Tools** — what data and write-actions the agent has access to.
- **Where the output appears** — exactly which UI surface(s) render the result.
- **In the pipeline** — what comes before and after.
- **Implementation** — pointers to the source file, the prompt, and the shared rules.

If you're reading this to understand the system as a whole, start with [Account Intelligence](01-account-intelligence.md) (step 1) and read in order. Each doc takes ~2 minutes.
