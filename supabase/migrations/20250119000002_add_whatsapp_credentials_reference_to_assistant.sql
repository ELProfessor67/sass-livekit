-- Add WhatsApp credentials reference to assistant table
-- This links assistants to centralized WhatsApp credentials

ALTER TABLE public.assistant 
ADD COLUMN whatsapp_credentials_id UUID REFERENCES public.user_whatsapp_credentials(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.assistant.whatsapp_credentials_id IS 'Reference to centralized WhatsApp credentials';

-- Create index for better query performance
CREATE INDEX idx_assistant_whatsapp_credentials_id ON public.assistant(whatsapp_credentials_id);
