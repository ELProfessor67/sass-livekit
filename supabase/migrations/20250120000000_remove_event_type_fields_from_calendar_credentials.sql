-- Remove event type fields from user_calendar_credentials table
-- These fields are no longer needed as event types are created during assistant creation

-- Remove the event type fields
ALTER TABLE public.user_calendar_credentials 
DROP COLUMN IF EXISTS event_type_id,
DROP COLUMN IF EXISTS event_type_slug;

-- Update comments to reflect the simplified approach
COMMENT ON TABLE public.user_calendar_credentials IS 'User-specific calendar integration credentials (simplified - no event types)';
COMMENT ON COLUMN public.user_calendar_credentials.provider IS 'Calendar provider (calcom, google, outlook)';
COMMENT ON COLUMN public.user_calendar_credentials.api_key IS 'API key for the calendar provider';
COMMENT ON COLUMN public.user_calendar_credentials.timezone IS 'Timezone for calendar events';
COMMENT ON COLUMN public.user_calendar_credentials.label IS 'User-friendly label for this calendar integration';
COMMENT ON COLUMN public.user_calendar_credentials.is_active IS 'Whether this is the active calendar integration for the user';

-- Note: Event types are now created automatically during assistant creation
-- and stored in the calendar_event_types table
