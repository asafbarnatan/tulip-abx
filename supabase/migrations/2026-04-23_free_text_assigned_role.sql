-- Drop the legacy CHECK constraint on account_actions.assigned_role so free-text
-- roles (e.g. "VP Revenue Operations", "Solutions Engineer") are accepted.
-- The 5 presets (AE / CSM / Sales / Marketing / Ecosystem) are now a UI
-- convenience, not a database-layer enum. Server validation still caps length at
-- 80 chars in the API routes.

ALTER TABLE account_actions DROP CONSTRAINT IF EXISTS account_actions_assigned_role_check;
