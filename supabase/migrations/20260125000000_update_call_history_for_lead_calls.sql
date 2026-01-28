-- Update call_history table to support lead calls from workflows
-- Make technical fields nullable to support in-progress calls
ALTER TABLE public.call_history ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE public.call_history ALTER COLUMN call_duration DROP NOT NULL;
ALTER TABLE public.call_history ALTER COLUMN call_duration SET DEFAULT 0;

-- Add tracking fields for lead calls
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS call_sid TEXT;

-- Add recording fields to call_history
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS recording_sid TEXT;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS recording_status TEXT;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS recording_duration INTEGER;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS recording_channels INTEGER;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS recording_start_time TEXT;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS recording_source TEXT;
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS recording_track TEXT;

-- Create index on call_sid if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_call_history_call_sid ON public.call_history(call_sid);

-- Add comments
COMMENT ON COLUMN public.call_history.contact_name IS 'Name of the contact for lead calls';
COMMENT ON COLUMN public.call_history.outcome IS 'Outcome of the call (e.g., interested, callback, voicemail)';
COMMENT ON COLUMN public.call_history.call_sid IS 'Twilio Call SID for tracking';
COMMENT ON COLUMN public.call_history.recording_sid IS 'Twilio Recording SID';
