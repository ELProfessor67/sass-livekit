-- Add call transfer fields to assistant table
-- These fields enable cold transfer functionality to route calls to another number

ALTER TABLE public.assistant 
ADD COLUMN IF NOT EXISTS transfer_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transfer_phone_number TEXT,
ADD COLUMN IF NOT EXISTS transfer_country_code TEXT DEFAULT '+1',
ADD COLUMN IF NOT EXISTS transfer_sentence TEXT,
ADD COLUMN IF NOT EXISTS transfer_condition TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.transfer_enabled IS 'Whether call transfer is enabled for this assistant';
COMMENT ON COLUMN public.assistant.transfer_phone_number IS 'Phone number to transfer calls to (without country code)';
COMMENT ON COLUMN public.assistant.transfer_country_code IS 'Country code for transfer phone number (e.g., +1, +44)';
COMMENT ON COLUMN public.assistant.transfer_sentence IS 'What the assistant will say before transferring the call';
COMMENT ON COLUMN public.assistant.transfer_condition IS 'Description of when the assistant should transfer the call';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_assistant_transfer_enabled ON public.assistant(transfer_enabled) 
WHERE transfer_enabled = true;


