-- Remove individual calendar fields from assistant table
-- These fields are now replaced by centralized calendar integrations

-- Drop the index first
DROP INDEX IF EXISTS idx_assistant_calendar_integration;

-- Remove the calendar fields
ALTER TABLE public.assistant 
DROP COLUMN IF EXISTS cal_api_key,
DROP COLUMN IF EXISTS cal_event_type_id,
DROP COLUMN IF EXISTS cal_event_type_slug,
DROP COLUMN IF EXISTS cal_timezone;

-- Add comment for the new calendar field
COMMENT ON COLUMN public.assistant.calendar IS 'Reference to user_calendar_credentials table for calendar integration';
