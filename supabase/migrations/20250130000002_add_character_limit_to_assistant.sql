-- Add character_limit column to assistant table
-- This field stores the maximum character limit for SMS responses

ALTER TABLE public.assistant 
ADD COLUMN character_limit INTEGER DEFAULT 160;

-- Add comment for documentation
COMMENT ON COLUMN public.assistant.character_limit IS 'Maximum character limit for SMS responses (default: 160)';

-- Create index for better query performance
CREATE INDEX idx_assistant_character_limit ON public.assistant(character_limit);
