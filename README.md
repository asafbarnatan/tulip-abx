# Tulip ABX

Account-based experience platform for Tulip's outbound motion. Built as a demo for the April 2026 CEO presentation.

**Live:** https://tulip-abx.vercel.app

## What's in here

A sales-ops platform built around five Tier-1 target accounts (Bayer AG, Daikin Industries, Boston Scientific, Thermo Fisher Scientific, RTX), with six Claude-powered agents that handle account intelligence, signal watching, positioning, play orchestration, LinkedIn outreach, and contact research.

- **Mission Control** — KPI bar, agent activity feed, pinned LinkedIn campaigns, account pulse.
- **Accounts** — tier-grouped dashboard → per-account detail with Positioning Brief (April Dunford format), Buying Group, Signals, Recommended Plays, Actions (interaction-stage workflow), Campaigns, Agents.
- **Agents** — showcase of the six-agent pipeline with run history.
- **Integrations** — LinkedIn (live), Salesforce + ZoomInfo (OAuth scaffolded, activate on credential provision).

## Stack

- Next.js 16 App Router + TypeScript (strict)
- Supabase (Postgres + REST via `@supabase/supabase-js`)
- Claude Opus 4.6 agents via Anthropic SDK (tool-use + SSE streaming)
- LinkedIn Marketing API (OAuth + adAnalyticsV2 sync + draft/publish)
- Vercel deploy with GitHub auto-build

## Local dev

```bash
npm install
npm run dev              # http://localhost:3000
npm run build            # production build
npm test                 # vitest (23 tests)
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
```

Environment variables live in `.env.local` (gitignored). See `lib/supabase.ts` and `lib/agents/*.ts` for the required keys.

## Deploy pipeline

Every push to `main` auto-deploys via Vercel → https://tulip-abx.vercel.app.

## Database migrations

Migrations live in `supabase/migrations/` and apply in chronological order. Run via the Supabase SQL editor.
