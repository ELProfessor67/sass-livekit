-- Migration: Add user_smtp_credentials table for per-tenant customized email sending

CREATE TABLE IF NOT EXISTS public.user_smtp_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_user TEXT NOT NULL,
    smtp_pass TEXT NOT NULL,
    smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
    from_email TEXT NOT NULL,
    from_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_smtp_credentials ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own smtp credentials" 
ON public.user_smtp_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own smtp credentials" 
ON public.user_smtp_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own smtp credentials" 
ON public.user_smtp_credentials 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own smtp credentials" 
ON public.user_smtp_credentials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_user_smtp_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_smtp_credentials_updated_at ON public.user_smtp_credentials;

CREATE TRIGGER trigger_user_smtp_credentials_updated_at
BEFORE UPDATE ON public.user_smtp_credentials
FOR EACH ROW
EXECUTE FUNCTION update_user_smtp_credentials_updated_at();

-- Add comments
COMMENT ON TABLE public.user_smtp_credentials IS 'Stores per-user customized SMTP credentials for sending emails (like workspace invitations).';
