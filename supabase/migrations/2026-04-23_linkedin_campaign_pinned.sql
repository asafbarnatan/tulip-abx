-- 2026-04-23 — Pin-to-top for LinkedIn campaigns in Mission Control.
--
-- A single `pinned_at` timestamp column is all we need. Null means not pinned.
-- When set, the row sorts above unpinned rows (pinned_at DESC NULLS LAST);
-- the PATCH endpoint enforces "single pinned at a time" by clearing every other
-- row's pinned_at before setting the current one, so ordering by timestamp is
-- stable (one pinned row wins).
--
-- The partial index keeps the ordering query cheap even as rows accumulate.
ALTER TABLE linkedin_campaigns
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_pinned_at
  ON linkedin_campaigns (pinned_at DESC)
  WHERE pinned_at IS NOT NULL;
