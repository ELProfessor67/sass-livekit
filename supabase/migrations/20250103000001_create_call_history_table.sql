-- Create call_history table for tracking LiveKit call sessions
CREATE TABLE IF NOT EXISTS call_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id TEXT NOT NULL UNIQUE,
    assistant_id TEXT NOT NULL,
    phone_number TEXT,
    participant_identity TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    call_duration INTEGER NOT NULL, -- duration in seconds
    call_status TEXT NOT NULL DEFAULT 'completed',
    transcription JSONB, -- array of {role, content} objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_call_history_assistant_id ON call_history(assistant_id);
CREATE INDEX IF NOT EXISTS idx_call_history_phone_number ON call_history(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_history_start_time ON call_history(start_time);
CREATE INDEX IF NOT EXISTS idx_call_history_call_status ON call_history(call_status);

-- Enable Row Level Security
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their own call history
CREATE POLICY "Users can view their own call history" ON call_history
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create policy for service role to insert call history
CREATE POLICY "Service role can insert call history" ON call_history
    FOR INSERT WITH CHECK (true);

-- Create policy for service role to update call history
CREATE POLICY "Service role can update call history" ON call_history
    FOR UPDATE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_call_history_updated_at
    BEFORE UPDATE ON call_history
    FOR EACH ROW
    EXECUTE FUNCTION update_call_history_updated_at();
