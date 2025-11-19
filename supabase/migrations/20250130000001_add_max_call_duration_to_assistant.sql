-- Add max_call_duration field to assistant table
-- This field will store the maximum call duration in minutes from the Model tab

ALTER TABLE public.assistant 
ADD COLUMN IF NOT EXISTS max_call_duration INTEGER DEFAULT 30;

-- Add comment for documentation
COMMENT ON COLUMN public.assistant.max_call_duration IS 'Maximum call duration in minutes to prevent excessive charges';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_assistant_max_call_duration ON public.assistant(max_call_duration) 
WHERE max_call_duration IS NOT NULL;






























