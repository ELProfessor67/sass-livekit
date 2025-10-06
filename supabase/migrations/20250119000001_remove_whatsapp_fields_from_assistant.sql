-- Remove WhatsApp Business fields from assistant table
-- These fields are now centralized in user_whatsapp_credentials table

-- Drop the index first
DROP INDEX IF EXISTS idx_assistant_whatsapp_fields;

-- Remove WhatsApp columns from assistant table
ALTER TABLE public.assistant 
DROP COLUMN IF EXISTS whatsapp_number,
DROP COLUMN IF EXISTS whatsapp_key;
