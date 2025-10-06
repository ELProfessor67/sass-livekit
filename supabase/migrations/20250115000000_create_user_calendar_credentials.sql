-- Create user_calendar_credentials table for centralized calendar integrations
-- This allows users to configure calendar credentials once and reuse them across assistants

CREATE TABLE public.user_calendar_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('calcom', 'google', 'outlook')),
  api_key TEXT NOT NULL,
  event_type_id TEXT,
  event_type_slug TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.user_calendar_credentials IS 'User-specific calendar integration credentials';
COMMENT ON COLUMN public.user_calendar_credentials.provider IS 'Calendar provider (calcom, google, outlook)';
COMMENT ON COLUMN public.user_calendar_credentials.api_key IS 'API key for the calendar provider';
COMMENT ON COLUMN public.user_calendar_credentials.event_type_id IS 'Event type ID for Cal.com';
COMMENT ON COLUMN public.user_calendar_credentials.event_type_slug IS 'Event type slug for Cal.com (e.g., team/demo-call)';
COMMENT ON COLUMN public.user_calendar_credentials.timezone IS 'Timezone for calendar events';
COMMENT ON COLUMN public.user_calendar_credentials.label IS 'User-friendly label for this calendar integration';
COMMENT ON COLUMN public.user_calendar_credentials.is_active IS 'Whether this is the active calendar integration for the user';

-- Create indexes for better query performance
CREATE INDEX idx_user_calendar_credentials_user_id ON public.user_calendar_credentials(user_id);
CREATE INDEX idx_user_calendar_credentials_provider ON public.user_calendar_credentials(provider);
CREATE INDEX idx_user_calendar_credentials_active ON public.user_calendar_credentials(user_id, provider, is_active) 
WHERE is_active = true;

-- Create unique constraint to ensure only one active calendar per provider per user
CREATE UNIQUE INDEX idx_user_calendar_credentials_unique_active 
ON public.user_calendar_credentials(user_id, provider) 
WHERE is_active = true;

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_calendar_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own calendar credentials" ON public.user_calendar_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar credentials" ON public.user_calendar_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar credentials" ON public.user_calendar_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar credentials" ON public.user_calendar_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_calendar_credentials_updated_at 
  BEFORE UPDATE ON public.user_calendar_credentials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
