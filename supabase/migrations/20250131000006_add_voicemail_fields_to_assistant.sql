-- Add voicemail detection fields to assistant table
-- These fields enable automatic voicemail detection and message delivery

ALTER TABLE public.assistant 
ADD COLUMN IF NOT EXISTS voicemail_detection_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS voicemail_message TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.voicemail_detection_enabled IS 'Whether voicemail detection is enabled for this assistant';
COMMENT ON COLUMN public.assistant.voicemail_message IS 'Custom message to leave when voicemail is detected';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_assistant_voicemail_enabled ON public.assistant(voicemail_detection_enabled) 
WHERE voicemail_detection_enabled = true;


