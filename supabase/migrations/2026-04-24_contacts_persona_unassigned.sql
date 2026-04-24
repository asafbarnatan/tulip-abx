-- 2026-04-24 — Let Buying Group contacts exist without a hard persona type.
--
-- Real enterprise buying groups often grow past 5 classical roles (Champion,
-- Economic Buyer, Technical Evaluator, End User, Blocker). When an AE adds a
-- new stakeholder they may not yet know which of those slots the person fits
-- into. 'Unassigned' gives them a way to log the person now and classify later
-- via the Edit modal.
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_persona_type_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_persona_type_check
  CHECK (persona_type IN ('Champion', 'Economic Buyer', 'Technical Evaluator', 'End User', 'Blocker', 'Unassigned'));
