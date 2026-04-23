-- Expand buying groups to reflect realistic ABX depth.
-- Current groups have 2-3 contacts each; real enterprise ABX tracks 6-10.
-- Adding End Users, Compliance/Regulatory, Exec Sponsors, and missing Technical Evaluators.

-- ============================================================================
-- BAYER AG — add Compliance + End User
-- ============================================================================

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Klaus Weber', 'Head of Compliance & Regulatory Affairs, Pharma Manufacturing', 'Technical Evaluator', 'linkedin.com/in/klaus-weber-bayer',
  ARRAY['EMA and FDA inspection preparation burden', 'audit trail integrity under GDPR', 'cross-site consistency for GxP validation'],
  'email'
FROM accounts WHERE name = 'Bayer AG';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Ingrid Schmitt', 'Production Supervisor, Wuppertal Line 3', 'End User', NULL,
  ARRAY['paper batch record friction during shift handoffs', 'operator errors from inconsistent written instructions', 'slow deviation reporting to quality team'],
  'email'
FROM accounts WHERE name = 'Bayer AG';

-- ============================================================================
-- DAIKIN INDUSTRIES — add Exec Sponsor + End User
-- ============================================================================

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Takeshi Fujimoto', 'Chief Digital Officer, Daikin Industries', 'Economic Buyer', 'linkedin.com/in/takeshi-fujimoto',
  ARRAY['¥50B smart factory program ROI accountability', 'fragmented digital tools across 98 plants', 'need for unified operational data layer to enable kaizen at scale'],
  'email'
FROM accounts WHERE name = 'Daikin Industries';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Aiko Sato', 'Line Leader, Shiga Factory Heat Exchanger Assembly', 'End User', NULL,
  ARRAY['paper work instructions that do not reflect current process', 'no real-time feedback on first-time yield', 'changeover setup errors from paper-based procedures'],
  'email'
FROM accounts WHERE name = 'Daikin Industries';

-- ============================================================================
-- BOSTON SCIENTIFIC — add Regulatory + End User
-- ============================================================================

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Robert Chen', 'Senior Director, Regulatory Affairs', 'Technical Evaluator', 'linkedin.com/in/robert-chen-bsc',
  ARRAY['21 CFR Part 11 compliance across newly acquired sites', 'DHR completeness variability post-M&A', 'FDA inspection readiness across 7-site footprint'],
  'email'
FROM accounts WHERE name = 'Boston Scientific';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Maria Gonzalez', 'Manufacturing Supervisor, Marlborough Cardiovascular Line', 'End User', NULL,
  ARRAY['operator onboarding time at new sites', 'guided assembly step skips that cause quality events', 'manual DHR entry errors'],
  'email'
FROM accounts WHERE name = 'Boston Scientific';

-- ============================================================================
-- RTX — add Technical Evaluator (cybersecurity), Compliance, End User
-- RTX only had 2 contacts; getting it to 5 for proper buying group depth.
-- ============================================================================

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Dr. Patricia Reyes', 'Head of Cybersecurity, Collins Aerospace', 'Technical Evaluator', 'linkedin.com/in/patricia-reyes-collins',
  ARRAY['CMMC Level 2 compliance for DoD contracts', 'controlled unclassified information handling on shop floor apps', 'FedRAMP Moderate Equivalency requirements for SaaS platforms'],
  'email'
FROM accounts WHERE name = 'RTX (Raytheon Technologies)';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Robert Henderson', 'Quality Compliance Officer, Pratt & Whitney Manufacturing', 'Technical Evaluator', 'linkedin.com/in/robert-henderson-pw',
  ARRAY['AS9100 audit trail reconstruction time', 'MIL-SPEC documentation consistency', 'first-article inspection workflow bottlenecks'],
  'email'
FROM accounts WHERE name = 'RTX (Raytheon Technologies)';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'John Mackenzie', 'Senior Assembly Technician, Pratt & Whitney East Hartford', 'End User', NULL,
  ARRAY['paper travelers getting damaged or lost mid-shift', 'rework from missing assembly steps', 'time spent hunting for current revision of technical drawings'],
  'email'
FROM accounts WHERE name = 'RTX (Raytheon Technologies)';

-- ============================================================================
-- THERMO FISHER — add Quality Technical Evaluator + End User
-- ============================================================================

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Dr. Amelia Foster', 'Head of Quality, Bioproduction Division', 'Technical Evaluator', 'linkedin.com/in/amelia-foster-tmf',
  ARRAY['cross-site batch variability driving deviation rates', 'paper-based quality records slowing release cycles', '21 CFR Part 11 validation effort for new tooling'],
  'email'
FROM accounts WHERE name = 'Thermo Fisher Scientific';

INSERT INTO contacts (account_id, name, title, persona_type, linkedin_url, inferred_pain_points, preferred_channel)
SELECT id, 'Rebecca Nguyen', 'Senior Process Technician, Waltham Bioproduction Site', 'End User', NULL,
  ARRAY['manual batch record entry errors under time pressure', 'waiting on quality sign-off for next process step', 'lack of real-time context on what prior shift left in progress'],
  'email'
FROM accounts WHERE name = 'Thermo Fisher Scientific';
