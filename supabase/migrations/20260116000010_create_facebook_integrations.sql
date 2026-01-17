-- Create facebook_integrations table
CREATE TABLE IF NOT EXISTS public.facebook_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    facebook_user_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    pages JSONB DEFAULT '[]', -- List of pages user has access to
    lead_forms JSONB DEFAULT '[]', -- List of lead forms user has access to
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, facebook_user_id)
);

-- Enable RLS
ALTER TABLE public.facebook_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own facebook integrations"
    ON public.facebook_integrations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own facebook integrations"
    ON public.facebook_integrations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facebook integrations"
    ON public.facebook_integrations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facebook integrations"
    ON public.facebook_integrations FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for update_at
CREATE TRIGGER update_facebook_integrations_updated_at
    BEFORE UPDATE ON public.facebook_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add index on user_id
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_user_id ON public.facebook_integrations(user_id);
