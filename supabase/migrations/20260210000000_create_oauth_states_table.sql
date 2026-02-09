-- Create table for storing OAuth states (temporary nonces)
-- This is useful for providers like GoHighLevel that don't reliably return the state parameter
CREATE TABLE IF NOT EXISTS public.oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nonce TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role needs access, but let's add basic policies for visibility
CREATE POLICY "Users can view their own oauth states"
    ON public.oauth_states FOR SELECT
    USING (auth.uid() = user_id);

-- Create index for performance on nonce lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_nonce ON public.oauth_states(nonce);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON public.oauth_states(expires_at);

-- Add comment
COMMENT ON TABLE public.oauth_states IS 'Temporary storage for OAuth state parameters and nonces';
