-- Create connections table for OAuth-style integrations
-- This unified table stores all OAuth connections (Slack, Facebook, etc.)
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('slack', 'facebook', 'hubspot', 'gohighlevel', 'twilio', 'google_ads')),
    label TEXT NOT NULL, -- User-friendly name like "My Slack Workspace"
    
    -- OAuth tokens (should be encrypted in production)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Provider-specific identifiers
    workspace_id TEXT, -- For Slack: workspace ID
    workspace_name TEXT, -- For Slack: workspace name
    page_id TEXT, -- For Facebook: page ID
    page_name TEXT, -- For Facebook: page name
    account_id TEXT, -- Generic account identifier
    
    -- Metadata for provider-specific data
    metadata JSONB DEFAULT '{}', -- Store provider-specific data (pages, forms, etc.)
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own connections"
    ON public.connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections"
    ON public.connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
    ON public.connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
    ON public.connections FOR DELETE
    USING (auth.uid() = user_id);

-- Unique constraint for upsert operations
-- This ensures one connection per user per provider per workspace
-- Note: We use a unique constraint (not index) so upsert can work properly
ALTER TABLE public.connections 
    ADD CONSTRAINT connections_user_provider_workspace_unique 
    UNIQUE (user_id, provider, workspace_id);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON public.connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_provider ON public.connections(provider);
CREATE INDEX IF NOT EXISTS idx_connections_active ON public.connections(user_id, provider, is_active) 
    WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.connections IS 'Unified table for OAuth-style integrations (Slack, Facebook, etc.)';
COMMENT ON COLUMN public.connections.provider IS 'Integration provider (slack, facebook, hubspot, gohighlevel, etc.)';
COMMENT ON COLUMN public.connections.label IS 'User-friendly label for this connection';
COMMENT ON COLUMN public.connections.workspace_id IS 'Provider workspace/account ID (e.g., Slack workspace ID)';
COMMENT ON COLUMN public.connections.page_id IS 'Facebook page ID (if applicable)';
COMMENT ON COLUMN public.connections.metadata IS 'Provider-specific data stored as JSONB';
