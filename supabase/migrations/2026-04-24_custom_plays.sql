-- 2026-04-24 — Per-account custom plays.
--
-- The PLAY_LIBRARY in lib/play-library.ts is a global set of templates shown
-- to every account whose trigger_conditions match. This table holds ad-hoc
-- plays an AE writes for ONE specific account — the play lives with that
-- account and disappears if the account is deleted (ON DELETE CASCADE).
--
-- Shape mirrors lib/play-library.ts Play interface so the same PlayRecommender
-- card component can render both library and custom plays with no conditional
-- logic in the renderer. Activation flow (creating account_actions with
-- play_id in notes JSON) is identical for both types.
CREATE TABLE IF NOT EXISTS custom_plays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 200),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  play_type TEXT NOT NULL CHECK (play_type IN ('outbound','inbound','event','exec','demo','cs_expansion','content')) DEFAULT 'outbound',
  owner_team TEXT NOT NULL CHECK (owner_team IN ('marketing','sales','sdr','cs')) DEFAULT 'sales',
  duration_days INTEGER NOT NULL DEFAULT 14 CHECK (duration_days > 0 AND duration_days <= 365),
  assets TEXT[] NOT NULL DEFAULT '{}',
  sample_outreach_opener TEXT NOT NULL DEFAULT '' CHECK (char_length(sample_outreach_opener) <= 4000),
  expected_outcome TEXT NOT NULL DEFAULT '' CHECK (char_length(expected_outcome) <= 1000),
  created_by_name TEXT,
  created_by_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_plays_account_id ON custom_plays (account_id);
