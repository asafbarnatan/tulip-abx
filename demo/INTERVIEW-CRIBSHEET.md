# Tulip ABX — Interview Crib Sheet

Open with this, every time:

> **"Tulip ABX is an account-based experience platform for Tulip's outbound motion — six Claude agents handle account intel, signals, positioning, plays, LinkedIn campaign content, and contact research, on a Mission Control built for AEs."**

One sentence. Move on.

---

## Setting the room

- **"15 minutes of demo, then yours — stop me anywhere."**
- Sections I'll touch (in order, but Nathan can rewire):
  1. Mission Control
  2. Accounts → Bayer (deep dive)
  3. Agents page
  4. Integrations (Tulip API)
- Tell him the demo is **live data** (Bayer LinkedIn campaign actually ran, $44 spent, 4 engagements, 8.70%).

---

## How it was built (10 seconds, not more)

- **Built in Claude Code**, started from **GStack** (Garry Tan's open-source Claude Code stack — `github.com/garrytan/gstack`)
- Framework: **Next.js + Supabase + Anthropic Claude Opus 4.6**
- Workflow: **plan → characterize → execute → ship to Vercel → iterate design with Claude Design**
- Auto-deploy from GitHub → Vercel on every push

If he digs in: "Happy to go deeper, but that's the boring part — let's look at the platform."

---

## Demo flow — talking points per section

### 1. Mission Control (the daily routine)

**What he sees:** "This is what an AE opens every morning."

- **KPI bar (top):** how the system is doing — accounts, agents active, pipeline coverage, brief approval, LinkedIn performance
- **Right side: LinkedIn Campaign Performance** — live numbers from the Bayer campaign
- **Left side: Agent Activity Feed** — recent agent runs, errors surface here
- **Bottom: Pipeline view** — workflow per account, agent attached to each step

**One line per tile (don't read numbers):**
> "Each tile is one job-to-be-done. CEO doesn't need the digit, just to know what it tracks."

**If asked CPC/CPL/CPM** (definitions are in tooltips on the platform too):
- **CPC** = cost per click
- **CPM** = cost per 1000 impressions
- **CPL** = cost per lead
- **Engagement rate** = engagements ÷ impressions (Bayer = 8.70%, top-quartile is ≥2%)

### 2. Accounts page (the portfolio)

- 5 accounts, **Tier 1 + Tier 2** (Bayer, Daikin, Boston Scientific, Thermo Fisher, RTX)
- Each row: ICP fit, intent, engagement, lifecycle stage, agent activity
- "I'll click into Bayer — it's where the live campaign is."

### 3. Account detail — Bayer (the deep dive)

**Top:** account header, scores (3 circles — hover for definitions), interaction stage stepper.

**Tabs (each = one agent's output):**

- **Positioning Brief** — April Dunford framework, **AI-generated, human-editable**. "If Nathan disagrees with a sentence, he edits it, the team sees the change."
- **Buying Group** — stakeholder map. Persona type per contact (champion / blocker / decision-maker).
- **Signals** — what triggered the agents. Real signals only, no fabricated intent.
- **Recommended Plays** — agent-drafted plays with opener + why-now + rationale. Editable.
- **Actions log** — interaction history. Stage stepper at top advances the account.
- **Campaigns tab** — Bayer's LinkedIn campaign, full SaaS B2B KPI panel. **Hover any tile = definition popup.** Worth flagging: the headline + ad copy here were drafted by the **LinkedIn Campaign agent** reading the **Positioning brief** — two-step pipeline, not generated from scratch.
- **Agents tab** — agent run history for this account.

**Key line:** "Every tab is one agent's output. Six agents, six surfaces, all editable."

### 4. Agents page

- Showcase of the **6 agents** with role, tooling, recent runs.
- "AccountIntel writes the bio. SignalWatcher prioritizes the backlog. Positioning writes the brief. PlayOrchestrator drafts the plays. **LinkedIn Campaign reads the brief and drafts the ad copy.** ContactResearch fills the buying group with cited, verifiable people."
- "All Claude Opus 4.6, all tool-calling, all observable in the activity feed."

### 5. Integrations (Tulip API readiness)

- LinkedIn Conversions API connected (live token).
- Salesforce + ZoomInfo OAuth scaffolded — flip on with credentials.
- "The platform is API-first; integrations are configuration, not engineering."

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

> "Three guardrails. **One**: every fact has to be quotable from a tool call — no source, no claim. **Two**: a verified-roster file in `lib/agents/content-rules.ts` lists exactly which companies we can name. **Three**: the brief is editable inline. When Nathan or an AE catches a slip, they fix it — and the next pipeline run inherits the corrected rule, not just the corrected output."

### Q3. "What's the one number on this page that tells me whether the platform is working?"

> "**Pipeline coverage on Tier 1.** If the platform is doing its job, every Tier-1 account moves to *pipeline* or *customer*. Today Bayer is in `proposal`, Boston Scientific in `discovery`. The KPI bar shows the ratio — 40% today, target is 100% by Q3."

### Q4. "How would you roll this out to 50 AEs at Tulip without it becoming a content nightmare?"

> "Two things. **One**: the editable-brief flow. AEs aren't writing copy from scratch — they're approving or editing what the agent drafted. **Two**: the rules file is the single source of truth. When marketing approves a new framing, it lands in `content-rules.ts` and 50 AEs get the new framing on their next pipeline run, no training session needed."

### Q5. "What would you build first if I gave you 30 days for production at Tulip?"

> "Salesforce sync. Everything in here is fed by Supabase today; in production it has to read from the source of truth. Once accounts and contacts flow in from Salesforce, the agents stop being a demo and start being decision support. Day-one ROI: every Tulip AE opens Mission Control instead of Salesforce reports."

---

## When you don't know the answer

> *"Honest answer — I haven't built that yet. Here's how I'd think about it…"*

That's the answer. Move on.

---

## Closing line (if he doesn't take over)

> "That's the platform. Six agents, one Mission Control, one source of truth. **What part do you want to break?**"
