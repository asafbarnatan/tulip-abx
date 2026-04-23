-- CEO REVIEW hardening migration — April 22, 2026
-- Bundles three fixes from the Review → Test → Ship → Reflect audit:
--   1. Data-integrity CHECK constraints on linkedin_campaigns
--   2. Schema catch-up for columns added to prod but not tracked in schema.sql
--   3. Composite indexes on hot-path tables (signals, contacts, actions, briefs, campaigns)
--
-- All statements are idempotent (IF NOT EXISTS, DO/EXCEPTION blocks).
-- Safe to run multiple times. Does not touch any existing data in the Bayer AG row.

-- ─────────────────────────────────────────────────────────────────────
-- PART 1 — Data-integrity CHECK constraints
-- ─────────────────────────────────────────────────────────────────────

-- Prevent writing a campaign as 'active' without a LinkedIn campaign ID.
-- An "active" campaign without an ID is a fabricated live-state row — caught at the DB.
DO $$ BEGIN
  ALTER TABLE linkedin_campaigns
    ADD CONSTRAINT linkedin_campaigns_active_requires_id
    CHECK (status <> 'active' OR linkedin_campaign_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Prevent impossible metric values (negative spend, clicks > impressions, etc.).
-- A CTR > 100% or negative spend in the UI would be instantly noticed during demo.
DO $$ BEGIN
  ALTER TABLE linkedin_campaigns
    ADD CONSTRAINT linkedin_campaigns_sane_metrics
    CHECK (
      impressions >= 0 AND
      clicks >= 0 AND
      leads >= 0 AND
      cost_usd >= 0 AND
      clicks <= impressions
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- PART 2 — Schema catch-up (columns added to prod, never committed to schema.sql)
-- ─────────────────────────────────────────────────────────────────────

-- Contacts: extra fields added via ContactResearchAgent path.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Signals: source URL + published timestamp for real-source attribution.
ALTER TABLE signals ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Accounts: plant count for the header infographic.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS manufacturing_plants_count INTEGER;

-- Account actions: agent-assigned stakeholder name + role.
ALTER TABLE account_actions ADD COLUMN IF NOT EXISTS assigned_role TEXT;
ALTER TABLE account_actions ADD COLUMN IF NOT EXISTS assigned_name TEXT;

-- Positioning briefs: structured positioning_statement JSONB (April Dunford schema).
ALTER TABLE positioning_briefs ADD COLUMN IF NOT EXISTS positioning_statement JSONB;

-- ─────────────────────────────────────────────────────────────────────
-- PART 3 — Composite indexes on hot-path queries
-- ─────────────────────────────────────────────────────────────────────

-- Signals backlog scan (Mission Control + SignalWatcherAgent): filters by account_id + processed.
CREATE INDEX IF NOT EXISTS idx_signals_account_processed
  ON signals(account_id, processed);

-- Contact load per account (buying group tab).
CREATE INDEX IF NOT EXISTS idx_contacts_account
  ON contacts(account_id);

-- Latest actions per account (ActionLog component).
CREATE INDEX IF NOT EXISTS idx_account_actions_account_created
  ON account_actions(account_id, created_at DESC);

-- Latest brief per account (PositioningBriefTab, PlayOrchestrator context load).
CREATE INDEX IF NOT EXISTS idx_positioning_briefs_account_generated
  ON positioning_briefs(account_id, generated_at DESC);

-- Campaign list per account (LinkedIn panel + per-account Campaigns tab).
CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_account_created
  ON linkedin_campaigns(account_id, created_at DESC);
