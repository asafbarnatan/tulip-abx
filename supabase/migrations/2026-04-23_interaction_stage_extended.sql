-- Extend the interaction_stage CHECK to include the full customer lifecycle
-- past closed_won: onboarding → adoption → expansion → renewal.
-- Idempotent: drops the old constraint if present, then re-adds with the new set.

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_interaction_stage_check;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_interaction_stage_check
  CHECK (interaction_stage IN (
    'prospecting',
    'discovery',
    'demo_eval',
    'proposal',
    'negotiation',
    'closed_won',
    'onboarding',
    'adoption',
    'expansion',
    'renewal',
    'closed_lost'
  ));
