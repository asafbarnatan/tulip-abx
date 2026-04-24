-- 2026-04-24 — Track LinkedIn total_engagements per campaign.
--
-- LinkedIn's "Total Engagement" column (sum of reactions + comments + shares +
-- follows + other clicks) is a stronger signal than raw CTR on low-volume B2B
-- ad sets. Engagement rate (total_engagements / impressions) maps to the
-- Campaign Manager "Engagement rate" metric 1:1.
--
-- The KPI bar replaces the single Aggregate CTR tile with Engagements +
-- Engagement Rate tiles after this migration. Engagement rate is calculated
-- on the fly in /api/kpis, not stored.
ALTER TABLE linkedin_campaigns
  ADD COLUMN IF NOT EXISTS total_engagements INTEGER NOT NULL DEFAULT 0
  CHECK (total_engagements >= 0);
