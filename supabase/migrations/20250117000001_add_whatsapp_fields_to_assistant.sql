-- Add WhatsApp Business fields to assistant table
-- These fields will store WhatsApp Business configuration for assistants

ALTER TABLE public.assistant 
ADD COLUMN whatsapp_number TEXT,
ADD COLUMN whatsapp_key TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.whatsapp_number IS 'WhatsApp Business phone number for messaging integration';
COMMENT ON COLUMN public.assistant.whatsapp_key IS 'WhatsApp Business API key for messaging integration';

-- Create index for better query performance on WhatsApp fields
CREATE INDEX idx_assistant_whatsapp_fields ON public.assistant(whatsapp_number, whatsapp_key) 
WHERE whatsapp_number IS NOT NULL OR whatsapp_key IS NOT NULL;
