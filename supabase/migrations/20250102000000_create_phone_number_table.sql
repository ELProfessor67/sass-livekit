-- Create phone_number table for mapping phone numbers to assistants
-- This table stores the relationship between phone numbers and their assigned assistants

CREATE TABLE public.phone_number (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_sid TEXT UNIQUE, -- Twilio phone number SID
  number TEXT NOT NULL, -- Phone number in E.164 format (e.g., +1234567890)
  label TEXT, -- Human-readable label for the phone number
  inbound_assistant_id UUID, -- ID of the assistant that should handle inbound calls
  webhook_status TEXT DEFAULT 'pending', -- Status of webhook configuration
  status TEXT DEFAULT 'active', -- Status of the phone number (active, inactive, etc.)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key to assistant table
  CONSTRAINT fk_phone_number_assistant 
    FOREIGN KEY (inbound_assistant_id) 
    REFERENCES public.assistant(id) 
    ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_phone_number_number ON public.phone_number(number);
CREATE INDEX idx_phone_number_assistant ON public.phone_number(inbound_assistant_id);
CREATE INDEX idx_phone_number_status ON public.phone_number(status);

-- Enable Row Level Security
ALTER TABLE public.phone_number ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view phone numbers for their assistants" 
ON public.phone_number 
FOR SELECT 
USING (
  inbound_assistant_id IN (
    SELECT id FROM public.assistant WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert phone numbers for their assistants" 
ON public.phone_number 
FOR INSERT 
WITH CHECK (
  inbound_assistant_id IN (
    SELECT id FROM public.assistant WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update phone numbers for their assistants" 
ON public.phone_number 
FOR UPDATE 
USING (
  inbound_assistant_id IN (
    SELECT id FROM public.assistant WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete phone numbers for their assistants" 
ON public.phone_number 
FOR DELETE 
USING (
  inbound_assistant_id IN (
    SELECT id FROM public.assistant WHERE user_id = auth.uid()
  )
);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_phone_number_updated_at
BEFORE UPDATE ON public.phone_number
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.phone_number IS 'Maps phone numbers to assistants for call routing';
COMMENT ON COLUMN public.phone_number.phone_sid IS 'Twilio phone number SID';
COMMENT ON COLUMN public.phone_number.number IS 'Phone number in E.164 format';
COMMENT ON COLUMN public.phone_number.inbound_assistant_id IS 'Assistant that handles inbound calls to this number';
COMMENT ON COLUMN public.phone_number.webhook_status IS 'Status of webhook configuration (pending, configured, failed)';
COMMENT ON COLUMN public.phone_number.status IS 'Status of the phone number (active, inactive, suspended)';
