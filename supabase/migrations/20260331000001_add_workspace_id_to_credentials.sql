-- Add workspace scoping to all integration/credential tables.
-- NULL = main account (user-level), non-null UUID = specific workspace.
--
-- NOTE: The `connections` table already uses `workspace_id` for the *provider's* own
-- workspace identifier (e.g. Slack team ID, HubSpot portal ID). We add a separate
-- `tenant_workspace_id` column for our SaaS workspace scoping.

-- user_twilio_credentials
ALTER TABLE user_twilio_credentials
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspace_settings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_twilio_credentials_workspace
  ON user_twilio_credentials(user_id, workspace_id);

-- user_calendar_credentials
ALTER TABLE user_calendar_credentials
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspace_settings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_calendar_credentials_workspace
  ON user_calendar_credentials(user_id, workspace_id);

-- user_whatsapp_credentials
ALTER TABLE user_whatsapp_credentials
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspace_settings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_whatsapp_credentials_workspace
  ON user_whatsapp_credentials(user_id, workspace_id);

-- user_smtp_credentials
ALTER TABLE user_smtp_credentials
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspace_settings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_smtp_credentials_workspace
  ON user_smtp_credentials(user_id, workspace_id);

-- connections (Slack, Facebook, HubSpot, GoHighLevel, etc.)
-- `workspace_id` already stores provider workspace (Slack team ID, HubSpot portal ID etc.)
-- `tenant_workspace_id` stores our SaaS workspace scoping
ALTER TABLE connections
  ADD COLUMN IF NOT EXISTS tenant_workspace_id UUID REFERENCES workspace_settings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_connections_tenant_workspace
  ON connections(user_id, provider, tenant_workspace_id);

-- facebook_integrations
ALTER TABLE facebook_integrations
  ADD COLUMN IF NOT EXISTS tenant_workspace_id UUID REFERENCES workspace_settings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_facebook_integrations_tenant_workspace
  ON facebook_integrations(user_id, tenant_workspace_id);

-- oauth_states (temporary nonces — store workspace so GHL callback can retrieve it)
ALTER TABLE oauth_states
  ADD COLUMN IF NOT EXISTS tenant_workspace_id UUID REFERENCES workspace_settings(id) ON DELETE CASCADE;
