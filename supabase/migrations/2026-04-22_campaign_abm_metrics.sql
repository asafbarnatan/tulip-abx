-- ABM-specific metric fields on linkedin_campaigns — populate these manually
-- (or via LinkedIn Demographics API when Marketing Developer Platform is live)
-- so the CampaignKpiPanel can render account reach, buying-committee depth,
-- and decision-maker share.

ALTER TABLE linkedin_campaigns ADD COLUMN IF NOT EXISTS audience_size INTEGER;
ALTER TABLE linkedin_campaigns ADD COLUMN IF NOT EXISTS unique_companies INTEGER;
ALTER TABLE linkedin_campaigns ADD COLUMN IF NOT EXISTS decision_maker_pct NUMERIC(5,2);
ALTER TABLE linkedin_campaigns ADD COLUMN IF NOT EXISTS target_account_count INTEGER DEFAULT 1;
