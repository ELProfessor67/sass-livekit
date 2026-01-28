-- Add subscriptions column to facebook_integrations
ALTER TABLE public.facebook_integrations 
ADD COLUMN IF NOT EXISTS subscriptions JSONB DEFAULT '[]';
