-- Add WhatsApp credentials fields to assistant table
-- These fields will store WhatsApp credentials populated from centralized user_whatsapp_credentials

ALTER TABLE public.assistant 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_key TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.whatsapp_number IS 'WhatsApp Business number populated from user_whatsapp_credentials';
COMMENT ON COLUMN public.assistant.whatsapp_key IS 'WhatsApp Business API key populated from user_whatsapp_credentials';

-- Create index for better query performance on WhatsApp fields
CREATE INDEX IF NOT EXISTS idx_assistant_whatsapp_integration ON public.assistant(whatsapp_number, whatsapp_key) 
WHERE whatsapp_number IS NOT NULL;
