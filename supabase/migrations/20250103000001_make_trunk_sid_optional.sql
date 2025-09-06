-- Make trunk_sid optional in user_twilio_credentials table
-- This allows the main trunk strategy to work without requiring manual trunk input

-- First, update existing records to have a default trunk_sid if they don't have one
UPDATE user_twilio_credentials 
SET trunk_sid = 'TK-' || user_id::text || '-' || EXTRACT(EPOCH FROM created_at)::bigint
WHERE trunk_sid IS NULL OR trunk_sid = '';

-- Now make the column nullable
ALTER TABLE user_twilio_credentials 
ALTER COLUMN trunk_sid DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN user_twilio_credentials.trunk_sid IS 'Twilio Trunk SID - auto-generated for main trunk strategy, can be null for legacy compatibility';
