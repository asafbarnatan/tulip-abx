-- TulipABX Database Schema

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  industry_vertical TEXT NOT NULL CHECK (industry_vertical IN ('Discrete Manufacturing', 'Pharmaceuticals', 'Medical Device', 'Aerospace & Defense', 'Life Sciences')),
  sub_vertical TEXT,
  geography TEXT NOT NULL CHECK (geography IN ('Japan', 'Europe', 'North America')),
  employee_count INTEGER NOT NULL DEFAULT 0,
  revenue_estimate TEXT,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)) DEFAULT 2,
  icp_fit_score INTEGER NOT NULL DEFAULT 50 CHECK (icp_fit_score BETWEEN 0 AND 100),
  intent_score INTEGER NOT NULL DEFAULT 30 CHECK (intent_score BETWEEN 0 AND 100),
  engagement_score INTEGER NOT NULL DEFAULT 20 CHECK (engagement_score BETWEEN 0 AND 100),
  lifecycle_stage TEXT NOT NULL CHECK (lifecycle_stage IN ('prospect', 'pipeline', 'customer', 'expansion')) DEFAULT 'prospect',
  primary_use_case TEXT,
  digital_maturity INTEGER NOT NULL CHECK (digital_maturity BETWEEN 1 AND 5) DEFAULT 2,
  assigned_ae TEXT,
  assigned_csm TEXT,
  headquarters TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts / buying group table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  persona_type TEXT NOT NULL CHECK (persona_type IN ('Champion', 'Economic Buyer', 'Technical Evaluator', 'End User', 'Blocker')),
  linkedin_url TEXT,
  last_touched_at TIMESTAMPTZ,
  inferred_pain_points TEXT[] DEFAULT '{}',
  preferred_channel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signals table
CREATE TABLE IF NOT EXISTS signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('intent', 'engagement', 'news', 'firmographic', 'product_usage')),
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')) DEFAULT 'neutral',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positioning briefs table
CREATE TABLE IF NOT EXISTS positioning_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  core_message TEXT NOT NULL,
  persona_messages JSONB NOT NULL DEFAULT '{}',
  proof_points TEXT[] DEFAULT '{}',
  objection_handlers JSONB DEFAULT '[]',
  recommended_tone TEXT NOT NULL DEFAULT 'consultative',
  key_themes TEXT[] DEFAULT '{}',
  approved BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account actions table
CREATE TABLE IF NOT EXISTS account_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('email', 'call', 'meeting', 'linkedin', 'event', 'content_send', 'demo', 'proposal', 'other')),
  performed_by TEXT NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('marketing', 'sales', 'cs', 'sdr')),
  contact_name TEXT,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (allow all for demo — no auth)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE positioning_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on accounts" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on signals" ON signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on positioning_briefs" ON positioning_briefs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on account_actions" ON account_actions FOR ALL USING (true) WITH CHECK (true);


-- ===========================
-- SEED DATA
-- ===========================

-- 1. Daikin Industries (Japan, Discrete Manufacturing, Tier 1, Prospect)
INSERT INTO accounts (name, domain, industry_vertical, geography, employee_count, revenue_estimate, tier, icp_fit_score, intent_score, engagement_score, lifecycle_stage, primary_use_case, digital_maturity, assigned_ae, headquarters, description)
VALUES (
  'Daikin Industries',
  'daikin.com',
  'Discrete Manufacturing',
  'Japan',
  90000,
  '$28B annual revenue',
  1,
  92,
  68,
  35,
  'prospect',
  'Digital work instructions + production tracking',
  3,
  'APAC Manufacturing AE',
  'Osaka, Japan',
  'Global leader in HVAC and refrigeration manufacturing. 90,000+ employees across 98 production facilities worldwide. Strong kaizen culture with increasing focus on digital factory initiatives. Manufacturing operations span compressor assembly, heat exchanger fabrication, and system integration. Current challenge: fragmented digital tools across facilities with no unified data layer for frontline operations.'
);

-- Daikin contacts
INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Hiroshi Yamamoto', 'VP of Manufacturing Operations', 'Economic Buyer', 'linkedin.com/in/hiroshi-yamamoto', ARRAY['Lack of real-time visibility into line status', 'Slow root cause analysis when quality issues occur', 'Inconsistent work instruction adherence across shifts'], 'linkedin'
FROM accounts WHERE name = 'Daikin Industries';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Keiko Nakamura', 'Plant Manager — Shiga Factory', 'Champion', 'linkedin.com/in/keiko-nakamura', ARRAY['Paper-based work instructions causing operator errors', 'No digital capture of machine data', 'Long changeover times due to manual processes'], 'email'
FROM accounts WHERE name = 'Daikin Industries';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Satoshi Fujiwara', 'IT/OT Systems Lead', 'Technical Evaluator', NULL, ARRAY['Integration complexity with existing ERP (SAP)', 'Cybersecurity requirements for OT networks', 'Vendor lock-in concerns'], 'email'
FROM accounts WHERE name = 'Daikin Industries';

-- Daikin signals
INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'intent', 'G2 / Bombora', 'Daikin corporate IT team researching "frontline operations platform" and "digital work instructions" — 3 sessions in past 14 days', 'positive', false
FROM accounts WHERE name = 'Daikin Industries';

INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'news', 'Reuters / Nikkei', 'Daikin announces ¥50B investment in smart factory initiatives across Japanese manufacturing sites through 2027', 'positive', true
FROM accounts WHERE name = 'Daikin Industries';

INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'firmographic', 'LinkedIn', 'Daikin posted 12 job listings in the past month for "Digital Manufacturing Engineer" and "Factory Automation Specialist" roles', 'positive', true
FROM accounts WHERE name = 'Daikin Industries';


-- 2. Bayer AG (Europe, Pharma, Tier 1, Pipeline)
INSERT INTO accounts (name, domain, industry_vertical, geography, employee_count, revenue_estimate, tier, icp_fit_score, intent_score, engagement_score, lifecycle_stage, primary_use_case, digital_maturity, assigned_ae, headquarters, description)
VALUES (
  'Bayer AG',
  'bayer.com',
  'Pharmaceuticals',
  'Europe',
  101000,
  '$50B annual revenue',
  1,
  88,
  52,
  61,
  'pipeline',
  'Electronic batch records + quality inspection',
  2,
  'EMEA Pharma AE',
  'Leverkusen, Germany',
  'Global pharmaceutical and life sciences company. Manufacturing operations span small molecule APIs, biologics, and crop science. Operating under strict FDA and EMA regulatory frameworks. Current challenge: paper-based batch records and manual quality inspection processes causing compliance risk and slow batch release cycles. Exploring digital transformation of manufacturing execution layer across 3 European sites.'
);

-- Bayer contacts
INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Dr. Andreas Müller', 'VP Quality & Compliance, Pharma Manufacturing', 'Economic Buyer', 'linkedin.com/in/andreas-muller-bayer', ARRAY['Batch deviation rates too high', 'Manual paper records creating audit trail gaps', 'FDA inspection preparation takes months of manual work'], 'email'
FROM accounts WHERE name = 'Bayer AG';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Claudia Becker', 'Head of Manufacturing Operations — Wuppertal Site', 'Champion', 'linkedin.com/in/claudia-becker', ARRAY['Operators spending too much time on paper documentation', 'No real-time visibility into batch status', 'Inconsistent processes across shifts'], 'email'
FROM accounts WHERE name = 'Bayer AG';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Marco Hoffmann', 'IT Director, Manufacturing Technology', 'Technical Evaluator', NULL, ARRAY['Integration with SAP MES and LIMS', 'GAMP 5 and CSV validation requirements', 'Data residency requirements under GDPR'], 'email'
FROM accounts WHERE name = 'Bayer AG';

-- Bayer signals
INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'engagement', 'Website + Webinar', 'Two Bayer contacts registered for Tulip''s "Pharma Manufacturing in the Age of AI" webinar', 'positive', true
FROM accounts WHERE name = 'Bayer AG';

INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'intent', '6sense', 'Bayer showing high intent on "electronic batch records" and "MES replacement" topics — spike in last 21 days', 'positive', false
FROM accounts WHERE name = 'Bayer AG';

INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'news', 'Pharma Manufacturing Magazine', 'Bayer announces plan to modernize manufacturing execution across EU sites by 2026 — €200M digital transformation budget confirmed', 'positive', true
FROM accounts WHERE name = 'Bayer AG';


-- 3. Boston Scientific (North America, Medical Device, Tier 1, Expansion)
INSERT INTO accounts (name, domain, industry_vertical, geography, employee_count, revenue_estimate, tier, icp_fit_score, intent_score, engagement_score, lifecycle_stage, primary_use_case, digital_maturity, assigned_ae, assigned_csm, headquarters, description)
VALUES (
  'Boston Scientific',
  'bostonscientific.com',
  'Medical Device',
  'North America',
  48000,
  '$14B annual revenue',
  1,
  85,
  40,
  78,
  'expansion',
  'Guided assembly + DHR + quality inspection',
  4,
  'NA Medical Device AE',
  'NA Medical Device CSM',
  'Marlborough, MA',
  'Global medical device manufacturer — cardiovascular, endoscopy, urology, and neuromodulation. EXISTING TULIP CUSTOMER across 2 manufacturing sites. Strong operational outcomes demonstrated. Opportunity to expand to 4 additional sites and add Factory Playback + AI quality inspection capabilities. CS relationship strong; exec sponsor in VP Quality. Contract renewal in 8 months.'
);

-- Boston Scientific contacts
INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Jennifer Kowalski', 'VP Quality, Global Manufacturing', 'Economic Buyer', 'linkedin.com/in/jennifer-kowalski-bsc', ARRAY['Inconsistent quality processes across newly acquired sites', 'DHR completeness issues at new plants', 'Pressure to reduce cost of quality'], 'email'
FROM accounts WHERE name = 'Boston Scientific';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'David Park', 'Sr. Director, Manufacturing Technology', 'Champion', 'linkedin.com/in/david-park-bsc', ARRAY['4 sites still on paper — need fast rollout', 'Factory Playback could transform their CAPA process', 'AI quality inspection aligns with their 2026 roadmap'], 'call'
FROM accounts WHERE name = 'Boston Scientific';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Lisa Tran', 'Director of IT, Operations Technology', 'Technical Evaluator', NULL, ARRAY['Integration complexity with Windchill PLM', 'Validation effort for new sites', 'Security review for AI features'], 'email'
FROM accounts WHERE name = 'Boston Scientific';

-- Boston Scientific signals
INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'product_usage', 'Tulip Platform Data', 'Boston Scientific app usage up 34% month-over-month — new sites requesting access to pilot Tulip', 'positive', true
FROM accounts WHERE name = 'Boston Scientific';

INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'engagement', 'CS Call Notes', 'QBR call with David Park — explicitly asked about Factory Playback availability and multi-site expansion pricing', 'positive', true
FROM accounts WHERE name = 'Boston Scientific';

INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'firmographic', 'PR / News', 'Boston Scientific completes acquisition of Axonics — adds 3 manufacturing sites, all currently not on any MES platform', 'positive', false
FROM accounts WHERE name = 'Boston Scientific';


-- 4. Raytheon Technologies / RTX (North America, Aerospace & Defense, Tier 2, Prospect)
INSERT INTO accounts (name, domain, industry_vertical, geography, employee_count, revenue_estimate, tier, icp_fit_score, intent_score, engagement_score, lifecycle_stage, primary_use_case, digital_maturity, assigned_ae, headquarters, description)
VALUES (
  'RTX (Raytheon Technologies)',
  'rtx.com',
  'Aerospace & Defense',
  'North America',
  185000,
  '$68B annual revenue',
  2,
  72,
  28,
  18,
  'prospect',
  'Guided assembly + traceability + compliance',
  2,
  'NA Aerospace & Defense AE',
  'Arlington, VA',
  'One of the world''s largest aerospace and defense manufacturers — Pratt & Whitney, Collins Aerospace, and Raytheon divisions. Complex assembly operations subject to AS9100, MIL-SPEC, and increasingly CMMC requirements. Frontline operations heavily paper-based in legacy facilities. Tulip''s FedRAMP Moderate Equivalency achievement is a significant differentiator for this account. Long sales cycle expected — 12–18 months. Early prospect stage.'
);

-- RTX contacts
INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Col. (Ret.) Thomas Bradley', 'VP Operations, Pratt & Whitney Manufacturing', 'Economic Buyer', NULL, ARRAY['Complex assembly traceability requirements', 'MIL-SPEC documentation burden on operators', 'Rework loops increasing cost and schedule risk'], 'email'
FROM accounts WHERE name = 'RTX (Raytheon Technologies)';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Samantha Rivers', 'Digital Manufacturing Program Manager', 'Champion', 'linkedin.com/in/samantha-rivers-rtx', ARRAY['No composable platform for building shop floor apps', 'IT-led MES projects taking 3+ years to deploy', 'Operators still using paper travelers for complex assemblies'], 'linkedin'
FROM accounts WHERE name = 'RTX (Raytheon Technologies)';

-- RTX signals
INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'intent', 'Bombora', 'RTX showing intent on "no-code manufacturing apps" and "shop floor digitization" — moderate intent signal', 'positive', false
FROM accounts WHERE name = 'RTX (Raytheon Technologies)';

INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'news', 'Defense News', 'RTX awarded $12B in new DoD contracts — increased production demand will pressure their existing manual assembly processes', 'positive', true
FROM accounts WHERE name = 'RTX (Raytheon Technologies)';


-- 5. Thermo Fisher Scientific (North America, Life Sciences, Tier 2, Late Pipeline)
INSERT INTO accounts (name, domain, industry_vertical, geography, employee_count, revenue_estimate, tier, icp_fit_score, intent_score, engagement_score, lifecycle_stage, primary_use_case, digital_maturity, assigned_ae, headquarters, description)
VALUES (
  'Thermo Fisher Scientific',
  'thermofisher.com',
  'Life Sciences',
  'North America',
  130000,
  '$43B annual revenue',
  2,
  75,
  61,
  54,
  'pipeline',
  'Quality inspection + electronic batch records',
  3,
  'NA Life Sciences AE',
  'Waltham, MA',
  'Global leader in life sciences tools, instruments, and contract manufacturing. Bioproduction and pharma services divisions manufacture biologics, cell and gene therapies, and consumables under FDA oversight. Complex multi-site operations across US, Europe, and Asia. Late-stage pipeline — procurement review underway. Primary competition is legacy MES vendor (Rockwell Automation). Decision expected in 60–90 days.'
);

-- Thermo Fisher contacts
INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Dr. Patricia Okonkwo', 'SVP Operations, Bioproduction Division', 'Economic Buyer', 'linkedin.com/in/patricia-okonkwo', ARRAY['Multi-site process inconsistency causing batch variability', 'FDA audit readiness burden', 'Inability to act on operational data in real time'], 'email'
FROM accounts WHERE name = 'Thermo Fisher Scientific';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Kevin Sharma', 'Director, Manufacturing Technology & Innovation', 'Champion', 'linkedin.com/in/kevin-sharma-tmf', ARRAY['Existing MES too rigid to adapt to new processes', 'No-code platform would reduce IT dependency', 'Wants to run AI pilot on quality inspection'], 'email'
FROM accounts WHERE name = 'Thermo Fisher Scientific';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Michael Crane', 'Head of IT, Manufacturing Systems', 'Blocker', NULL, ARRAY['Concerned about validation and CSV effort', 'Prefers incumbent vendor relationship', 'Risk-averse on new platform commitments'], 'email'
FROM accounts WHERE name = 'Thermo Fisher Scientific';

-- Thermo Fisher signals
INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'engagement', 'Sales CRM', 'Kevin Sharma responded positively to AI quality demo — asked for follow-up on validation documentation and pricing', 'positive', true
FROM accounts WHERE name = 'Thermo Fisher Scientific';

INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'intent', '6sense', 'Procurement team viewed Tulip pricing page twice — and compared to Rockwell Plex competitor page', 'positive', true
FROM accounts WHERE name = 'Thermo Fisher Scientific';

INSERT INTO signals (account_id, signal_type, source, content, sentiment, processed)
SELECT id, 'engagement', 'Legal/Procurement', 'MSA sent to Thermo Fisher legal — in review. IT Blocker (Michael Crane) raised security questionnaire.', 'neutral', true
FROM accounts WHERE name = 'Thermo Fisher Scientific';


-- ===========================
-- AGENTIC MARKETING TABLES
-- ===========================

-- Agent runs: tracks every agent execution with step-level logging
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  trigger_source TEXT DEFAULT 'manual',
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  input_summary TEXT,
  output_summary TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  error_message TEXT,
  duration_ms INTEGER,
  model TEXT NOT NULL DEFAULT 'claude-opus-4-6',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on agent_runs" ON agent_runs FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started_at ON agent_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_account_id ON agent_runs(account_id);

-- LinkedIn campaigns: tracks campaigns created via LinkedIn Marketing API
CREATE TABLE IF NOT EXISTS linkedin_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  linkedin_campaign_id TEXT,
  campaign_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','failed')),
  objective TEXT DEFAULT 'WEBSITE_VISITS',
  ad_copy TEXT,
  headline TEXT,
  target_companies TEXT[] DEFAULT '{}',
  budget_usd NUMERIC(10,2) DEFAULT 500,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,2) DEFAULT 0,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE linkedin_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on linkedin_campaigns" ON linkedin_campaigns FOR ALL USING (true) WITH CHECK (true);

-- KPI snapshots: daily point-in-time captures for sparkline trending
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_accounts INTEGER DEFAULT 0,
  tier1_accounts INTEGER DEFAULT 0,
  pipeline_accounts INTEGER DEFAULT 0,
  avg_icp_score NUMERIC(5,2) DEFAULT 0,
  avg_engagement_score NUMERIC(5,2) DEFAULT 0,
  briefs_approved INTEGER DEFAULT 0,
  briefs_total INTEGER DEFAULT 0,
  plays_activated INTEGER DEFAULT 0,
  signals_unprocessed INTEGER DEFAULT 0,
  agent_runs_today INTEGER DEFAULT 0,
  linkedin_impressions_total INTEGER DEFAULT 0,
  linkedin_clicks_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on kpi_snapshots" ON kpi_snapshots FOR ALL USING (true) WITH CHECK (true);

-- App settings: single-row config store (LinkedIn OAuth tokens etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  linkedin_access_token TEXT,
  linkedin_refresh_token TEXT,
  linkedin_token_expires_at TIMESTAMPTZ,
  linkedin_org_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
INSERT INTO app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
