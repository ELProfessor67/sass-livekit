-- Add calendar credential fields back to assistant table
-- These fields will store the actual calendar credentials populated from integrations

ALTER TABLE public.assistant 
ADD COLUMN IF NOT EXISTS cal_api_key TEXT,
ADD COLUMN IF NOT EXISTS cal_event_type_id TEXT,
ADD COLUMN IF NOT EXISTS cal_event_type_slug TEXT,
ADD COLUMN IF NOT EXISTS cal_timezone TEXT DEFAULT 'UTC';

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.cal_api_key IS 'Calendar API key populated from user_calendar_credentials';
COMMENT ON COLUMN public.assistant.cal_event_type_id IS 'Calendar event type ID populated from user_calendar_credentials';
COMMENT ON COLUMN public.assistant.cal_event_type_slug IS 'Calendar event type slug populated from user_calendar_credentials';
COMMENT ON COLUMN public.assistant.cal_timezone IS 'Calendar timezone populated from user_calendar_credentials';
COMMENT ON COLUMN public.assistant.calendar IS 'Reference to user_calendar_credentials table for calendar integration';

-- Create index for better query performance on calendar fields
CREATE INDEX IF NOT EXISTS idx_assistant_calendar_integration ON public.assistant(cal_api_key, cal_event_type_id) 
WHERE cal_api_key IS NOT NULL;
