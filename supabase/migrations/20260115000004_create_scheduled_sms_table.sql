-- Create scheduled_sms table
CREATE TABLE public.scheduled_sms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed, cancelled
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.scheduled_sms IS 'SMS messages scheduled to be sent at a future time';

-- Create indexes for performance
CREATE INDEX idx_scheduled_sms_status_time ON public.scheduled_sms(status, scheduled_for);
CREATE INDEX idx_scheduled_sms_appointment_id ON public.scheduled_sms(appointment_id);
CREATE INDEX idx_scheduled_sms_user_id ON public.scheduled_sms(user_id);

-- Enable RLS
ALTER TABLE public.scheduled_sms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own scheduled SMS" ON public.scheduled_sms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled SMS" ON public.scheduled_sms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled SMS" ON public.scheduled_sms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled SMS" ON public.scheduled_sms
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_sms_updated_at 
  BEFORE UPDATE ON public.scheduled_sms 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
