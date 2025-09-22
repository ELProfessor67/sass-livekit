-- Add new webhook columns to the assistant table
-- This migration adds support for the updated webhook configuration structure

-- Add webhook URL column
ALTER TABLE assistant 
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT;

-- Add webhook fields column (stored as JSONB for flexibility)
ALTER TABLE assistant 
ADD COLUMN IF NOT EXISTS n8n_webhook_fields JSONB;

-- Add comments to document the new columns
COMMENT ON COLUMN assistant.n8n_webhook_url IS 'The n8n webhook URL where data will be sent';
COMMENT ON COLUMN assistant.n8n_webhook_fields IS 'Array of webhook field definitions with name and description';

-- Optional: Create an index on the webhook URL for better query performance
CREATE INDEX IF NOT EXISTS idx_assistant_n8n_webhook_url 
ON assistant(n8n_webhook_url) 
WHERE n8n_webhook_url IS NOT NULL;

-- Optional: Create a GIN index on webhook fields for JSON queries
CREATE INDEX IF NOT EXISTS idx_assistant_n8n_webhook_fields 
ON assistant USING GIN(n8n_webhook_fields) 
WHERE n8n_webhook_fields IS NOT NULL;
