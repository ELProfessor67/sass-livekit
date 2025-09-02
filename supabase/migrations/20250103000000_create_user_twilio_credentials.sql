-- Create user_twilio_credentials table to store user-specific Twilio credentials
CREATE TABLE IF NOT EXISTS user_twilio_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_sid TEXT NOT NULL,
  auth_token TEXT NOT NULL,
  trunk_sid TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one active credential per user
  UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_twilio_credentials_user_id ON user_twilio_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_twilio_credentials_active ON user_twilio_credentials(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE user_twilio_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own Twilio credentials" ON user_twilio_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Twilio credentials" ON user_twilio_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Twilio credentials" ON user_twilio_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Twilio credentials" ON user_twilio_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_twilio_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_user_twilio_credentials_updated_at
  BEFORE UPDATE ON user_twilio_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_user_twilio_credentials_updated_at();

-- Create function to deactivate other credentials when a new one is set as active
CREATE OR REPLACE FUNCTION deactivate_other_twilio_credentials()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new record is being set as active, deactivate all other credentials for this user
  IF NEW.is_active = true THEN
    UPDATE user_twilio_credentials 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically deactivate other credentials
CREATE TRIGGER trigger_deactivate_other_twilio_credentials
  BEFORE INSERT OR UPDATE ON user_twilio_credentials
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_other_twilio_credentials();
