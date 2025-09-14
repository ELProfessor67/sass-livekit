-- Create SMS messages table
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_sid TEXT UNIQUE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  body TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  num_segments TEXT,
  price TEXT,
  price_unit TEXT,
  date_created TIMESTAMPTZ NOT NULL,
  date_sent TIMESTAMPTZ,
  date_updated TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation_id ON sms_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_to_number ON sms_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_from_number ON sms_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_direction ON sms_messages(direction);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_date_created ON sms_messages(date_created);
CREATE INDEX IF NOT EXISTS idx_sms_messages_message_sid ON sms_messages(message_sid);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sms_messages_updated_at 
    BEFORE UPDATE ON sms_messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own SMS messages" ON sms_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SMS messages" ON sms_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMS messages" ON sms_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SMS messages" ON sms_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Add SMS count to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS total_sms INTEGER DEFAULT 0;

-- Create function to update SMS count
CREATE OR REPLACE FUNCTION update_conversation_sms_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations 
    SET total_sms = total_sms + 1,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE conversations 
    SET total_sms = GREATEST(total_sms - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.conversation_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update SMS count
CREATE TRIGGER update_conversation_sms_count_trigger
  AFTER INSERT OR DELETE ON sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_sms_count();

