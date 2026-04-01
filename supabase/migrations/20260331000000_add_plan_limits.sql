-- Add plan limit columns to plan_configs
-- max_assistants: NULL = unlimited, N = cap N assistants per user
-- workspaces_enabled: false hides workspace creation entirely for plan users
-- max_workspaces: NULL = unlimited, N = cap N workspaces per user

ALTER TABLE plan_configs
  ADD COLUMN IF NOT EXISTS max_assistants INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS workspaces_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_workspaces INTEGER DEFAULT NULL;

COMMENT ON COLUMN plan_configs.max_assistants IS 'Maximum assistants per user on this plan. NULL = unlimited.';
COMMENT ON COLUMN plan_configs.workspaces_enabled IS 'Whether workspace creation is available for users on this plan.';
COMMENT ON COLUMN plan_configs.max_workspaces IS 'Maximum workspaces per user on this plan. NULL = unlimited. Only applies when workspaces_enabled is true.';
