# Tulip ABX

> **Account-Based Experience platform — six Claude agents, one Mission Control, one source of truth for the account.** Marketing, SDRs, AEs, CS, and Renewals all open the same view of the same account, with the same approved positioning. Agents draft, humans decide.

**Live:** https://tulip-abx.vercel.app

---

## The thesis

Tulip's enterprise accounts (six-figure ACV, complex buying groups, multi-year relationships) live across Marketing, SDRs, AEs, CS, and Renewals — but no shared system holds the account context. Each function delivers in isolation, so the customer experiences a fragmented Tulip. The white space is the **connective tissue between teams**, not another CRM or Jira. Five accounts in this build (Bayer AG, Daikin Industries, Boston Scientific, Thermo Fisher Scientific, RTX) prove the pattern.

---

## How it works

**Two motions, six agents.**

### Per-Account Pipeline (5 agents, in dependency-correct order)

Click **Run Pipeline** on Mission Control. Five agents fire sequentially — each one's output feeds the next:

| # | Agent | What it does | Renders in |
|---|---|---|---|
| 1 | [**Account Intelligence**](docs/agents/01-account-intelligence.md) | Reads firmographics, buying group, signals, touchpoints. Writes a synthesis. Updates ICP / intent / engagement scores. | Account header + Signals tab |
| 2 | [**Contact Research**](docs/agents/02-contact-research.md) | Fills the next empty buying-group slot (Champion → Economic Buyer → Technical Evaluator) with a real person, cited from a public source. | Buying Group tab |
| 3 | [**Positioning**](docs/agents/03-positioning.md) | April Dunford brief — positioning statement, strategic narrative, three pillars, persona messages, proof points, objection handlers. | Positioning Brief tab |
| 4 | [**Play Orchestrator**](docs/agents/04-play-orchestrator.md) | Drafts the top 3 plays (opener, why-now, rationale, target contact), grounded in the brief. | Recommended Plays + Actions tabs |
| 5 | [**LinkedIn Campaign**](docs/agents/05-linkedin-campaign.md) | Drafts headline + ad copy anchored in the approved brief. Saves as a draft in LinkedIn Campaign Manager. Never auto-launches. | Campaigns tab + Mission Control LinkedIn panel |

### Portfolio Sweep (1 agent, runs separately)

Click **Run Signal Watch** in the Mission Control header. [**Signal Watcher**](docs/agents/06-signal-watcher.md) sweeps all 5 accounts in one pass, ranks them critical / high / medium / low by urgency, updates intent scores, marks signals processed. Output: Mission Control Account Pulse + intent scores.

> **Detailed agent docs:** [`docs/agents/`](docs/agents/) — one MD per agent with purpose, tools, prompts, and where each output lands.

### How content stays accurate

`lib/agents/content-rules.ts` is the single source of truth shared by every agent. Verified Tulip customer roster, banned framings, real Tulip AI feature names, account-name precision rules, zero-fabrication contract — all interpolated into every prompt. When a rule changes, every agent inherits it on the next run.

---

## Stack

- **Next.js 16** App Router · **TypeScript** strict · **Tailwind**
- **Supabase** (Postgres) — accounts, contacts, signals, briefs, plays, actions, LinkedIn campaigns, agent runs
- **Anthropic Claude Opus 4.6** — tool-use loop with SSE streaming back to the UI
- **LinkedIn Marketing API** — OAuth, Conversions API, CSV import for performance metrics
- **Vercel** — auto-deploy on push to `main`

---

## What's in the repo

```
app/                   Next.js App Router routes
  accounts/            Account portfolio + per-account detail (7 tabs)
  agents/              Agents showcase (per-account pipeline + portfolio sweep)
  api/                 Tool endpoints + agent run streaming + LinkedIn integration
  dashboard/           Account Intelligence Dashboard
  mission-control/     The daily-driver view

components/            React components
  AgentShowcase/       Agent cards (numbered pipeline + portfolio split)
  BriefEditor/         Editable positioning brief sections
  ActionLog/           Stage stepper + interaction modal
  MissionControl/      KPI bar, LinkedIn panel, agent activity feed
  ui/                  shadcn-style primitives

lib/
  agents/              Six agent implementations + shared content-rules.ts
  agents/content-rules.ts   ← single source of truth for every prompt
  brief-generator.ts   Brief format helpers
  icp-scorer.ts        Deterministic ICP scoring
  play-library.ts      Play templates seed
  positioning-kernel.ts     Tulip positioning context (vertical × geography × maturity)
  proof-points.ts      Verified Tulip proof points

supabase/
  schema.sql           Full schema (accounts, briefs, plays, actions, campaigns, agent_runs)
  migrations/          Chronological migrations (apply via Supabase SQL editor)

scripts/               Maintenance + content-quality scripts
  scan-mes-layer-violations.mjs    Sweep for forbidden framings
  scrub-mes-layer-violations.mjs   Surgical content fix
  set-linkedin-token.mjs           Wire up LinkedIn API access
  ...                              (per-account brief patch + verification scripts)

demo/                  Project context
  Tulip-ABX-Meeting-Prep.md     Initial point of view + framing

docs/
  agents/              ← One MD per agent: purpose, tools, prompts, output mapping
  screenshots/         Reference screenshots

test/                  Vitest suite (currently 23 passing)
```

---

## Quickstart

```bash
git clone https://github.com/asafbarnatan/tulip-abx
cd tulip-abx
npm install
cp .env.local.example .env.local   # fill in Supabase + Anthropic keys (LinkedIn optional)
npm run dev                         # → http://localhost:3000
npm run typecheck                   # tsc --noEmit
npm test                            # vitest (23 tests)
```

Required environment variables (see `.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `ANTHROPIC_API_KEY` — Claude Opus 4.6 access
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` — Marketing API OAuth (optional; integrations work without)

---

## Live LinkedIn campaign

A real Sponsored Content campaign was drafted by the agent, reviewed by a human, and published to LinkedIn against a narrow ABM audience — Bayer employees in Germany, English-speaking, in 17 specific senior Quality and Manufacturing IT titles. Performance numbers ingest via CSV import from LinkedIn Campaign Manager; live Marketing API sync activates on Tulip credentials.

---

## Status

| Surface | State |
|---|---|
| Mission Control | Live |
| Per-account detail (7 tabs) | Live, all editable |
| Six-agent pipeline | Live, observable in activity feed |
| LinkedIn — Conversions API | Connected today |
| LinkedIn — Marketing API (live performance sync) | Wired, awaits credentials |
| Salesforce / ZoomInfo | OAuth scaffolded, awaits credentials |
| Multi-user / per-AE attribution | Roadmap |

---

## Deploy

Every push to `main` triggers a Vercel build → https://tulip-abx.vercel.app. Build typically completes in under 60 seconds.
