# Tulip ABX — Interview Crib Sheet

Open with this, every time:

> **"Tulip ABX is an account-based experience platform for Tulip's GTM motion — marketing, sales, AEs, and CS all work off the same six Claude agents that handle account intel, signals, positioning, plays, LinkedIn campaign content, and contact research."**

One sentence. Move on.

---

## Setting the room

- **"15 minutes of demo, then yours — stop me anywhere."**
- Sections I'll touch (in order, but Nathan can rewire):
  1. Mission Control
  2. Accounts → Bayer (deep dive)
  3. Agents page
  4. Integrations
- Make it clear up front: the Bayer LinkedIn campaign is real (campaign closed 4/25, $44 spent, 4 engagements, 8.70% engagement rate).

---

## How it was built (10 seconds, not more)

- **Built in Claude Code.** Started from **GStack** — open-source Claude Code stack from **Garry Tan (Y Combinator CEO)**.
- **Data layer:** Supabase. That's where everything is stored.
- **Agents:** Anthropic Claude Opus 4.6. During the build I also leaned on specialized **Claude Code subagents** — design review, marketing content writing, orchestration — each owning a slice of the work.
- **Process:** plan → spec → build → ship to Vercel → design polish with Claude Design. Auto-deploy on every push.

If he digs in: *"Happy to go deeper, but that's the boring part — let's look at the platform."*

---

## Demo flow — talking points per section

### 1. Mission Control (the daily routine)

**Frame:** *"This is what the GTM team opens every morning."*

Three zones, top to bottom:

- **System overview (KPI bar)** — how the platform itself is doing: agents active, accounts under management, pipeline coverage, brief approval, plus aggregated **LinkedIn Campaign Performance** (impressions, engagements, engagement rate, spend across active + draft campaigns).
- **Pipeline + Campaigns section** — the two sides of the operating loop:
  - **Left: Pipeline launcher + Agent Activity Feed.** Pick an account, pick a pipeline, run it. Recent agent runs surface here — including failures.
  - **Right: LinkedIn Campaigns.** Cards for every campaign — active, draft, completed. **Bayer is pinned at the top — this is a campaign that just wrapped, ran over the last few days.**

**One-line framing for tiles:** *"Each tile is one job-to-be-done. Don't read the digit — read what it tracks."*

**Pipeline view — what "Full Pipeline" means:**

A pipeline is an **orchestrated sequence** of agents on one account. **Full Pipeline** runs **5 per-account agents in dependency-correct order** — each one's output feeds the next:

1. **AccountIntel** — reads the account, sets scores, writes the intelligence summary
2. **ContactResearch** — fills the next empty buying-group slot (Champion → Economic Buyer → Technical Evaluator) with a real, cited person
3. **Positioning** — writes the brief, *key messages, strategic pillars, persona angles*
4. **PlayOrchestrator** — drafts plays, *grounded in the brief*
5. **LinkedIn Campaign** — drafts ad copy, *anchored in the approved brief*

Single-agent pipelines available too — *Intelligence Only*, *Positioning Only*, *Play Recommender*, *LinkedIn Campaign*, *Contact Research* — for refreshing one surface without re-running the whole account.

**SignalWatcher = a separate, portfolio-wide pipeline** — runs from the Mission Control header ("Run Signal Watch"). It sweeps all 5 accounts in one pass and ranks them by urgency. It's not part of Full Pipeline because its scope is the portfolio, not a single account.

> *"Six agents total — five collaborate on one account when you click Run Pipeline, one sweeps the entire portfolio when you click Run Signal Watch."*

### 2. Accounts page (the portfolio)

- **5 accounts, Tier 1 + Tier 2** — Bayer, Daikin, Boston Scientific, Thermo Fisher, RTX.
- Each row: ICP fit, intent, engagement, lifecycle stage.
- *"I'll click into Bayer — it's the account with the closed campaign."*

### 3. Account detail — Bayer (the deep dive)

**Header:**
- Account name + lifecycle/interaction stage stepper.
- Three score circles (ICP, Intent, Engagement) — hover for definitions.
- **Firmographics tile** — industry, geography, size, revenue.
- **Account Signals tile** below — the SignalWatcher's read on what's hot.

**Tabs (call them out by name, then ask):**

> *"Each tab is a different lens on Bayer — Positioning Brief, Recommended Plays, Buying Group, Signals, Actions, Campaigns, Agents. **Is there a particular one you want me to dive into?** If not, I'll start with Positioning."*

**Tab-to-agent mapping** (use this if Nathan asks "who wrote this"):
- **Positioning Brief** ← PositioningAgent
- **Recommended Plays** ← PlayOrchestratorAgent
- **Buying Group** ← ContactResearchAgent (with AccountIntel seeding)
- **Signals** ← SignalWatcher + AccountIntelligence
- **Campaigns** ← LinkedIn Campaign agent (anchored in the Positioning brief)
- **Actions** ← interaction log (manual + actions spawned from plays)
- **Agents** ← meta view: every run that's touched this account

> *"And every tab is editable. If Nathan disagrees with a sentence in the Positioning brief, he edits it — and the whole team sees the aligned version on their next refresh. Same for plays, contacts, signals."*

#### Deep dive: Positioning tab (one word per section)

- **Positioning Statement** — the one-sentence pitch in April Dunford structure (For / Category / Key benefit / Unlike / Because).
- **Strategic Narrative** — internal AE briefing: WHY NOW + THE PLAY, bulleted.
- **Strategic Pillars** — three angles the AE leads conversations with.
- **Persona Messages** — one tailored opener per contact in the buying group.
- **Proof Points** — verified Tulip case studies and capabilities to drop into a meeting.
- **Objection Handlers** — prepared responses to "we already have MES," "too expensive," etc.
- **Recommended Tone** — consultative / challenger / executive — sets the register.
- **Edit button** — every section is human-editable. Save = the team sees the new version on their next refresh.

#### Deep dive: Signals tab

- One card per signal — intent, news, engagement, firmographic, product usage.
- The ones that haven't been touched yet are the **incoming queue** — the SignalWatcher's job to score and prioritize.

#### Deep dive: Buying Group tab

- The map of stakeholders inside Bayer who matter for the deal — one card per real person.
- Each card shows: name, title, persona type (champion / decision-maker / blocker / technical evaluator / end user), pain points, preferred channel.
- **ContactResearch agent** built this list from real, publicly verifiable people — every contact is backed by a cited source (LinkedIn profile, press release, company page). It refuses to invent names.
- AE can add, edit, or remove contacts inline. Free-text persona type if the standard ones don't fit.

#### Deep dive: Bayer Campaign tab

- The card you saw on Mission Control, with full SaaS B2B KPI panel below.
- Hover any tile — definition popup pops up (CTR, CPC, CPM, CPL, Engagement rate).
- **Worth saying out loud:** *"The headline + ad copy here were drafted by the LinkedIn Campaign agent reading the Positioning brief. Two-step pipeline — strategy from Positioning, customer-facing copy from LinkedIn Campaign. Not generated from scratch."*

### 4. Agents page

The page is split into **two visual sections** that mirror how the agents actually run:

**Per-Account Pipeline (5 agents, in order — same sequence as Full Pipeline):**

1. **Account Intelligence** → output in **Account header + Signals tab**
2. **Contact Research** → output in **Buying Group tab**
3. **Positioning** → output in **Positioning Brief tab**
4. **Play Orchestrator** → output in **Recommended Plays + Actions tabs**
5. **LinkedIn Campaign** → output in **Campaigns tab + Mission Control LinkedIn panel**

**Portfolio Sweep (1 agent, runs separately):**

- **Signal Watcher** → output in **Mission Control Account Pulse + intent scores**

> *"Six agents, two motions. Five run in dependency-correct sequence on one account. One sweeps the whole portfolio."*

### 5. Integrations

- **LinkedIn** — connected today. Live performance data flips on with Tulip's Marketing API credentials.
- **Salesforce + ZoomInfo** — wired and ready. Plug in Tulip's credentials and accounts, contacts, and intent data flow in.

> *"Integrations are a configuration step, not an engineering project."*

---

## Behavior reminders (from Dor)

- **No defensive mood.** Push-back is the test, not the failure.
- **Show confidence.** Speak about *meaning*, not details.
- **No ego.** "Don't know" beats fabrication. Nathan is testing for that.
- **Let him lead.** He'll stop you wherever. That's the demo working.
- **Don't read.** You wrote the platform — talk *about* it, don't *recite* it.
- **High-level only.** Managers don't want the implementation; they want the shape of the bet.
- **Put on a show.** This is theater with substance. Energy matters.

---

## 5 questions Nathan will likely ask

(Practice the answer until it's reflex — short, confident, no hedging.)

### Q1. "What's the moat? Isn't this just a Claude wrapper with a Supabase backend?"

> "The moat is the **content rules baked into every agent prompt** — verified customer roster, banned framings, real Tulip AI features by name. A Claude wrapper invents 'DePuy Synthes is a Tulip customer.' This one knows it can't, because Nathan reviewed the rules and they're in version control. The technology is commodity; the ground truth isn't."

### Q2. "Show me where an agent invented something. How do you keep it accurate?"

> "Three guardrails. **One**: every fact has to be quotable from a tool call — no source, no claim. **Two**: a verified-roster file in `lib/agents/content-rules.ts` lists exactly which companies we can name. **Three**: every brief is editable inline. When Nathan or an AE catches a slip, they fix it — and the next pipeline run inherits the corrected rule, not just the corrected output."

### Q3. "What's the one number on this page that tells me whether the platform is working?"

> "**Pipeline coverage on Tier 1.** If the platform is doing its job, every Tier-1 account moves to *pipeline* or *customer*. Today Bayer is in `proposal`, Boston Scientific in `discovery`. The KPI bar shows the ratio — target is 100% by Q3."

### Q4. "How would you roll this out across marketing, sales, AEs, and CS at Tulip without it becoming a content nightmare?"

> "Two things. **One**: editable briefs and editable plays. The team isn't writing copy from scratch — they're approving or editing what the agent drafted. **Two**: the rules file is the single source of truth. When marketing approves a new framing, it lands in `content-rules.ts` and every team gets the new framing on their next pipeline run, no training session needed."

### Q5. "What would you build first if I gave you 30 days for production at Tulip?"

> "Salesforce + Marketing API. Today everything is fed by Supabase and CSV. In production, Salesforce becomes the source of truth for accounts and contacts, and the LinkedIn Marketing API streams campaign performance live. Once those two flip, the agents stop being a demo and start being decision support — every Tulip rep opens Mission Control instead of a Salesforce report."

---

## When you don't know the answer

> *"Honest answer — I haven't built that yet. Here's how I'd think about it…"*

That's the answer. Move on.

---

## Closing line (if he doesn't take over)

> "That's the platform. Six agents, one Mission Control, one source of truth. **What part do you want to break?**"
