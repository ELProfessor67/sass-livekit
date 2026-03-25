-- Migration to add minute_limit and minutes_used to workspace_settings
ALTER TABLE workspace_settings 
ADD COLUMN IF NOT EXISTS minute_limit INTEGER DEFAULT 1400,
ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;
