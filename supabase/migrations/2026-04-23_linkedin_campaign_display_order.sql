-- 2026-04-23 — Manual drag-to-reorder for LinkedIn campaigns.
--
-- `display_order` is an integer rank; lower = earlier. The reorder endpoint
-- writes 0-based indices for every campaign in the new order in a single pass,
-- so we don't need a uniqueness constraint or gaps-style ranking scheme.
--
-- Ordering priority in the GET /api/linkedin/campaigns query:
--   1. pinned_at DESC NULLS LAST    (featured spotlight always wins)
--   2. display_order ASC NULLS LAST (manual drag order)
--   3. created_at DESC              (newest first fallback)
--
-- NULL means "never reordered" — those rows fall to the bottom (after manually
-- ordered ones) and sort among themselves by created_at.
ALTER TABLE linkedin_campaigns
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_display_order
  ON linkedin_campaigns (display_order ASC)
  WHERE display_order IS NOT NULL;
