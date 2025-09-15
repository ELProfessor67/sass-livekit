-- Add SIP configuration columns to user_twilio_credentials table
-- This migration adds the necessary columns for dynamic SIP trunk configuration

ALTER TABLE user_twilio_credentials 
ADD COLUMN domain_name TEXT,
ADD COLUMN domain_prefix TEXT,
ADD COLUMN credential_list_sid TEXT,
ADD COLUMN sip_username TEXT,
ADD COLUMN sip_password TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_twilio_credentials_domain_name 
ON user_twilio_credentials(domain_name);

CREATE INDEX IF NOT EXISTS idx_user_twilio_credentials_credential_list_sid 
ON user_twilio_credentials(credential_list_sid);

-- Add comments for documentation
COMMENT ON COLUMN user_twilio_credentials.domain_name IS 'Full Twilio termination domain name (e.g., user-123-456.pstn.twilio.com)';
COMMENT ON COLUMN user_twilio_credentials.domain_prefix IS 'Domain prefix without .pstn.twilio.com suffix';
COMMENT ON COLUMN user_twilio_credentials.credential_list_sid IS 'Twilio credential list SID for SIP authentication';
COMMENT ON COLUMN user_twilio_credentials.sip_username IS 'SIP authentication username';
COMMENT ON COLUMN user_twilio_credentials.sip_password IS 'SIP authentication password';

