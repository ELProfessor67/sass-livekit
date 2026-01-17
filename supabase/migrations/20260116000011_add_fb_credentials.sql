-- Add app_id and app_secret to facebook_integrations
ALTER TABLE public.facebook_integrations 
ADD COLUMN IF NOT EXISTS app_id TEXT,
ADD COLUMN IF NOT EXISTS app_secret TEXT;

-- Update RLS for safety (though existing policies should cover it as they are based on user_id)
