-- Create user_whatsapp_credentials table for centralized WhatsApp Business integration
-- This allows users to configure WhatsApp credentials once and reuse them across assistants

CREATE TABLE public.user_whatsapp_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL,
  whatsapp_key TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.user_whatsapp_credentials IS 'User-specific WhatsApp Business integration credentials';
COMMENT ON COLUMN public.user_whatsapp_credentials.whatsapp_number IS 'WhatsApp Business phone number (include country code)';
COMMENT ON COLUMN public.user_whatsapp_credentials.whatsapp_key IS 'WhatsApp Business API key';
COMMENT ON COLUMN public.user_whatsapp_credentials.label IS 'User-friendly label for this WhatsApp integration';
COMMENT ON COLUMN public.user_whatsapp_credentials.is_active IS 'Whether this is the active WhatsApp integration for the user';

-- Create indexes for better query performance
CREATE INDEX idx_user_whatsapp_credentials_user_id ON public.user_whatsapp_credentials(user_id);
CREATE INDEX idx_user_whatsapp_credentials_active ON public.user_whatsapp_credentials(user_id, is_active) 
WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.user_whatsapp_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own WhatsApp credentials" ON public.user_whatsapp_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp credentials" ON public.user_whatsapp_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp credentials" ON public.user_whatsapp_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp credentials" ON public.user_whatsapp_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_whatsapp_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_user_whatsapp_credentials_updated_at
  BEFORE UPDATE ON public.user_whatsapp_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_user_whatsapp_credentials_updated_at();
