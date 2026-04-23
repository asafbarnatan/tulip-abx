-- Interaction stage on accounts — granular sales-funnel progression,
-- distinct from the existing lifecycle_stage (prospect/pipeline/customer/expansion)
-- which tracks portfolio maturity. interaction_stage tracks the real-time
-- client-journey status the sales team coordinates on.

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS interaction_stage TEXT
  CHECK (interaction_stage IN (
    'prospecting',
    'discovery',
    'demo_eval',
    'proposal',
    'negotiation',
    'closed_won',
    'closed_lost'
  ))
  DEFAULT 'prospecting';

-- Seed the Bayer row to a realistic mid-journey stage so the demo tells a story.
UPDATE accounts
  SET interaction_stage = 'demo_eval'
  WHERE name = 'Bayer AG'
    AND (interaction_stage IS NULL OR interaction_stage = 'prospecting');
