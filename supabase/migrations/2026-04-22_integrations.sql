-- Integrations: LinkedIn ads scope flag + Salesforce + ZoomInfo credentials.
-- Run this once in Supabase SQL editor.

-- LinkedIn: track whether r_ads_reporting was granted (OAuth scope upgrade).
-- Without this scope the adAnalyticsV2 endpoint returns 403 and sync is blocked.
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS linkedin_ads_scope_ok BOOLEAN DEFAULT FALSE;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS linkedin_granted_scopes TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS linkedin_last_sync_at TIMESTAMPTZ;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS linkedin_last_sync_error TEXT;

-- Salesforce: OAuth 2.0 web-server flow credentials.
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS salesforce_instance_url TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS salesforce_access_token TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS salesforce_refresh_token TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS salesforce_token_expires_at TIMESTAMPTZ;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS salesforce_identity TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS salesforce_last_sync_at TIMESTAMPTZ;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS salesforce_last_sync_error TEXT;

-- ZoomInfo: stores the API key used to mint JWTs at request time.
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS zoominfo_username TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS zoominfo_client_id TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS zoominfo_private_key TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS zoominfo_access_token TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS zoominfo_token_expires_at TIMESTAMPTZ;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS zoominfo_last_sync_at TIMESTAMPTZ;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS zoominfo_last_sync_error TEXT;

-- Accounts: track external IDs so we can link ABX accounts to Salesforce/ZoomInfo.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS salesforce_account_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS zoominfo_company_id TEXT;
CREATE INDEX IF NOT EXISTS idx_accounts_salesforce_id ON accounts(salesforce_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_zoominfo_id ON accounts(zoominfo_company_id);

-- Salesforce opportunities: synced 1:many with accounts.
CREATE TABLE IF NOT EXISTS salesforce_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  sf_opportunity_id TEXT UNIQUE NOT NULL,
  name TEXT,
  stage_name TEXT,
  amount NUMERIC(14,2),
  close_date DATE,
  probability NUMERIC(5,2),
  owner_name TEXT,
  last_modified_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE salesforce_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on salesforce_opportunities" ON salesforce_opportunities FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_sf_opps_account ON salesforce_opportunities(account_id);
