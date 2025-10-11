-- Add AI-powered call outcome analysis fields to call_history table
-- This migration adds fields to store OpenAI-determined call outcomes and analysis details

-- Add new columns for AI outcome analysis
ALTER TABLE call_history 
ADD COLUMN IF NOT EXISTS outcome_confidence DECIMAL(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS outcome_reasoning TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS outcome_key_points JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS outcome_sentiment VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS follow_up_notes TEXT DEFAULT NULL;

-- Add constraints for outcome_confidence (0.0 to 1.0)
ALTER TABLE call_history 
ADD CONSTRAINT check_outcome_confidence 
CHECK (outcome_confidence IS NULL OR (outcome_confidence >= 0.0 AND outcome_confidence <= 1.0));

-- Add constraint for outcome_sentiment
ALTER TABLE call_history 
ADD CONSTRAINT check_outcome_sentiment 
CHECK (outcome_sentiment IS NULL OR outcome_sentiment IN ('positive', 'neutral', 'negative'));

-- Add index for outcome_confidence for analytics queries
CREATE INDEX IF NOT EXISTS idx_call_history_outcome_confidence 
ON call_history(outcome_confidence) 
WHERE outcome_confidence IS NOT NULL;

-- Add index for outcome_sentiment for sentiment analysis queries
CREATE INDEX IF NOT EXISTS idx_call_history_outcome_sentiment 
ON call_history(outcome_sentiment) 
WHERE outcome_sentiment IS NOT NULL;

-- Add index for follow_up_required for follow-up management
CREATE INDEX IF NOT EXISTS idx_call_history_follow_up_required 
ON call_history(follow_up_required) 
WHERE follow_up_required = TRUE;

-- Update existing call_outcome values to use AI-determined format
-- Map old hardcoded outcomes to new AI-determined format
UPDATE call_history 
SET call_outcome = CASE 
    WHEN call_outcome = 'Booked Appointment' THEN 'booked_appointment'
    WHEN call_outcome = 'Completed' THEN 'completed'
    WHEN call_outcome = 'Not Qualified' THEN 'not_qualified'
    WHEN call_outcome = 'Spam' THEN 'spam'
    WHEN call_outcome = 'Message to Franchise' THEN 'message_to_franchise'
    WHEN call_outcome = 'Call Dropped' THEN 'call_dropped'
    WHEN call_outcome = 'No Response' THEN 'no_response'
    ELSE call_outcome
END
WHERE call_outcome IS NOT NULL;

-- Add comment to document the new AI outcome system
COMMENT ON COLUMN call_history.outcome_confidence IS 'Confidence score (0.0-1.0) from OpenAI analysis of call outcome';
COMMENT ON COLUMN call_history.outcome_reasoning IS 'AI-generated reasoning for the determined call outcome';
COMMENT ON COLUMN call_history.outcome_key_points IS 'Key points extracted from the call conversation';
COMMENT ON COLUMN call_history.outcome_sentiment IS 'Overall sentiment of the call (positive, neutral, negative)';
COMMENT ON COLUMN call_history.follow_up_required IS 'Whether follow-up action is required based on AI analysis';
COMMENT ON COLUMN call_history.follow_up_notes IS 'AI-generated notes for follow-up actions';
