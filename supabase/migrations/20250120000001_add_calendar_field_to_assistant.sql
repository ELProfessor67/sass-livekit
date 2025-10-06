-- Add calendar field to assistant table
-- This field references the user_calendar_credentials table

ALTER TABLE public.assistant 
ADD COLUMN IF NOT EXISTS calendar UUID REFERENCES public.user_calendar_credentials(id);

-- Add comment for documentation
COMMENT ON COLUMN public.assistant.calendar IS 'Reference to user_calendar_credentials table for calendar integration';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_assistant_calendar ON public.assistant(calendar) 
WHERE calendar IS NOT NULL;
