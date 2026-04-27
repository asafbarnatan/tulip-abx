# Tulip ABX — Initial Point of View

---

## The Problem

Tulip's go-to-market strategy targets a defined set of high-value enterprise manufacturing accounts — accounts with six-figure ACV potential, complex multi-stakeholder buying groups, and long lifecycle relationships.

Winning and expanding these accounts requires a true Account-Based Experience: account-based marketing that reaches the right personas with the right message, account-based selling that converts with account-specific positioning, and account-based customer success that deepens the relationship by remembering what was promised and what was agreed. Each stage must be continuous with the one before it.

Tulip does not yet have the infrastructure to run this consistently at scale. There is no shared system that holds the account's key messages, persona map, and engagement history — and surfaces it to every function at the right moment. The Tulip ABX Command Center is built to fill that gap.

---

## What the Tulip ABX Command Center Is

The Tulip ABX Command Center is a single operating system for how Tulip runs its most important accounts.

It holds everything that matters for a named account — the positioning tailored to their vertical and geography, the key messages agreed for each persona, the buying group map, the commitments made during the sales process, and every marketing and sales touchpoint that has occurred. It surfaces the right context to the right Tulip team member at the right stage — so that Marketing, Sales, AEs, CS, and Renewals all work the same account, not separate versions of it.

It is not a CRM. It is not a campaign tool. It is the connective layer between Tulip's positioning and every touchpoint that account will ever experience.

---

## Who It Is For

| Role | Primary use |
|---|---|
| **Demand Gen / ABX Marketer** | Choose plays, launch programs, track account engagement |
| **SDR** | Craft outbound sequences using account-specific context and persona messaging |
| **Account Executive** | Prepare for calls, align on buying group, use the right message for the right stakeholder |
| **Customer Success / Renewals** | Maintain continuity from sales handoff, identify expansion signals, coordinate retention plays |
| **RevOps / Marketing Ops / CEO Office** | Own the system, maintain positioning accuracy, and track play performance across accounts |

---

## Core Workflows

**1. Understand the account**
Ingest firmographics, buying group, intent signals, engagement history, and news. Score ICP fit. Map maturity. Surface what Tulip knows — and what it doesn't.

**2. Detect signals**
As the account situation evolves — new executive hires, budget announcements, engagement spikes, or intent signals — the platform flags what changed and prompts the team to reassess. Scores update and play recommendations refresh accordingly.

**3. Generate the right positioning**
Adapt Tulip's messaging to this account's vertical, geography, digital maturity, and buying personas. Output a messaging brief that every team member can use.

**4. Recommend coordinated plays**
Based on the account's stage and signals, recommend 3–5 plays (outbound, events, demos, exec briefings, CS expansion). Match plays to the right team owner with sample copy and assets.

**5. Log and share actions**
Every touchpoint — email, call, demo, event — is logged against the account and visible to all functions. One shared record means no team member walks into a conversation without knowing what's already happened.

**6. Stay current**
As signals change, the platform updates scores, re-prioritizes plays, and flags when the messaging brief should be regenerated.

---

## What the Platform Outputs

- **Account brief** — synthesized context: who they are, where they are, what matters to them
- **Positioning brief** — Tulip's message adapted to this account, with per-persona variants
- **Buying group map** — stakeholders, their role, their pain points, their last touchpoint
- **Recommended plays** — which campaign or outreach motion to run next, and who owns it
- **Message starters** — persona-specific message starters for SDRs and AEs
- **Action feed** — shared log of all touchpoints across Marketing, Sales, and CS
- **Expansion signals** — for CS: indicators that an account is ready to expand to new sites or use cases

---

## What Stays Consistent. What Adapts.

**The foundation — consistent across all accounts:**
- Tulip's core positioning: composable operations platform, human-centric AI, no-code app building, open ecosystem, continuous transformation
- Core proof points and brand voice

**Adapted — per account:**
- Industry angle (Discrete Mfg pain points ≠ Pharma regulatory framing ≠ MedDev compliance language)
- Geography tone and cultural context (Japan: consensus, kaizen (continuous improvement), long-term trust; Europe: compliance, engineering depth; US: ROI, speed to value)
- Digital maturity level (paper-based → partially digitized → data-rich but underutilized)
- Buying persona emphasis (Plant Manager: throughput; Quality Director: compliance; CDO: AI strategy)
- Recommended entry point and play type

---

## Key Assumptions

1. The core challenge is not an internal operations handoff problem — it is the absence of a continuous account-based marketing motion. Marketing, Sales, and CS are each doing their job, but without a shared account context, the experience they deliver is fragmented rather than coordinated.
2. Marketing, Sales, and CS currently have limited tooling for account-level coordination — likely fragmented across Salesforce, ZoomInfo, LinkedIn Premium, and individual AE notes
3. Tulip does not have a dedicated ABX platform today
4. The platform will be most valuable in the pre-sale to pipeline phase, but must extend through CS to be truly cross-functional
5. Signal data in v1 will be mostly manual before automated intent feeds are integrated
6. Tulip's AI capabilities — Factory Playback, Agents in Workflows, and Frontline Copilot AI Chat — are key differentiators that should feature prominently in recommended plays

---

## MVP Recommendation

**Build the Tulip ABX Command Center — a full cross-functional workspace.**

The MVP demonstrates the complete ABX motion end-to-end: account intelligence, AI-generated positioning briefs, recommended plays, buying group mapping, and a shared action log. It is not a document or a concept — it is a working platform that Marketing, SDRs, AEs, CS, and Renewals can open and use today.

**MVP scope:**
- 5 pre-loaded named accounts across Tulip's strategic verticals and geographies
- AI-generated positioning brief per account (adapted by vertical, geography, maturity, and persona)
- Per-persona message variants (Plant Manager vs. VP Ops vs. IT vs. Quality Director)
- Recommended plays based on lifecycle stage and account signals
- Simple action log for cross-functional teams to share touchpoints
- No automation in v1 — signals and account data entered manually

**What stays manual in v1:** account data entry, signal logging, brief approval, play activation

**What gets automated in v2:** ZoomInfo integration for firmographic enrichment; LinkedIn integration for buying group intelligence and intent signals; Salesforce integration for pipeline and engagement data

**What stays human always:** brief approval and play activation — these require human judgment by design

---

## Open questions

1. Is the bigger pain point the continuity gap across functions, or the operational handoff between teams?
2. Who currently owns ABX or ABM at Tulip — is there a dedicated function, or is it distributed across demand gen, field marketing, and sales?
3. How do AEs currently prepare for a first meeting with a new enterprise account — what information do they typically have, and where does it come from?
4. How deeply is Salesforce being used for account-level context today — is it mostly pipeline tracking, or does it hold richer account intelligence?
5. Does Tulip currently use ZoomInfo or LinkedIn Premium for account research and contact enrichment, and how is that data being used in practice?
6. How large is the named account universe for this platform — roughly how many Tier 1 accounts is Tulip actively running an ABX motion on?
7. Is the challenge scoped to the pre-sale motion, or does the vision extend through the full lifecycle including CS and expansion?
8. Does Tulip have a documented messaging framework by vertical or persona, or is messaging currently more ad hoc per AE?
