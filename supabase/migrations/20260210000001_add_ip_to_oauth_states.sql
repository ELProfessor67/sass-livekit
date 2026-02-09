-- Add ip_address column to oauth_states table for fallback identification
ALTER TABLE public.oauth_states ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Create index for performance on IP lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_ip_address ON public.oauth_states(ip_address);
