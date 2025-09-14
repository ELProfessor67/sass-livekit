-- Add SMS fields to assistant table
-- These fields will store the first SMS message and SMS prompt for assistants

ALTER TABLE public.assistant 
ADD COLUMN first_sms TEXT,
ADD COLUMN sms_prompt TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.first_sms IS 'First SMS message sent by the assistant when SMS conversation starts';
COMMENT ON COLUMN public.assistant.sms_prompt IS 'System prompt used for SMS conversations with the assistant';

-- Create index for better query performance on SMS fields
CREATE INDEX idx_assistant_sms_fields ON public.assistant(first_sms, sms_prompt) 
WHERE first_sms IS NOT NULL OR sms_prompt IS NOT NULL;
