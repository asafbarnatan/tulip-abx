-- 2026-04-24 — Allow free-text buying-group roles.
--
-- Real enterprise deals produce stakeholder titles that don't fit neatly into
-- the classical 5-role taxonomy (Champion / Economic Buyer / Technical
-- Evaluator / End User / Blocker) plus our Unassigned escape hatch. Drop the
-- enum CHECK entirely; keep a length cap and NOT NULL so the field still
-- holds a meaningful identifier. The UI surfaces the classical 6 as preset
-- suggestions via a datalist, but any custom string is now persisted.
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_persona_type_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_persona_type_check
  CHECK (char_length(persona_type) > 0 AND char_length(persona_type) <= 120);
