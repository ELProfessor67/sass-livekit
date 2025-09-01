-- Add calendar integration fields to assistant table
-- These fields will store Cal.com credentials for in-call scheduling

ALTER TABLE public.assistant 
ADD COLUMN cal_api_key TEXT,
ADD COLUMN cal_event_type_id TEXT,
ADD COLUMN cal_event_type_slug TEXT,
ADD COLUMN cal_timezone TEXT DEFAULT 'UTC';

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.cal_api_key IS 'Cal.com API key for calendar integration';
COMMENT ON COLUMN public.assistant.cal_event_type_id IS 'Cal.com event type ID for scheduling';
COMMENT ON COLUMN public.assistant.cal_event_type_slug IS 'Cal.com event type slug (e.g., team/demo-call)';
COMMENT ON COLUMN public.assistant.cal_timezone IS 'Timezone for calendar events (default: UTC)';

-- Create index for better query performance on calendar fields
CREATE INDEX idx_assistant_calendar_integration ON public.assistant(cal_api_key, cal_event_type_id) 
WHERE cal_api_key IS NOT NULL;
