-- Add white label fields to public.users table
-- This enables multi-tenant white label functionality

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS slug_name TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main',
ADD COLUMN IF NOT EXISTS website_name TEXT,
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS live_demo_agent_id UUID REFERENCES public.assistant(id),
ADD COLUMN IF NOT EXISTS live_demo_phone_number TEXT,
ADD COLUMN IF NOT EXISTS policy_text TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.users.slug_name IS 'Unique subdomain identifier for white label (e.g., "mycompany" for mycompany.domain.com)';
COMMENT ON COLUMN public.users.custom_domain IS 'Custom domain for white label tenant (e.g., "mycompany.com")';
COMMENT ON COLUMN public.users.tenant IS 'Tenant identifier - defaults to "main" for main site, or slug_name for white label tenants';
COMMENT ON COLUMN public.users.website_name IS 'Custom website name for white label branding';
COMMENT ON COLUMN public.users.logo IS 'URL to custom logo for white label branding';
COMMENT ON COLUMN public.users.contact_email IS 'Contact email for white label tenant';
COMMENT ON COLUMN public.users.meta_description IS 'SEO meta description for white label tenant';
COMMENT ON COLUMN public.users.live_demo_agent_id IS 'Default assistant ID for live demo';
COMMENT ON COLUMN public.users.live_demo_phone_number IS 'Phone number for live demo';
COMMENT ON COLUMN public.users.policy_text IS 'Custom policy text for white label tenant';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_slug_name ON public.users(slug_name) WHERE slug_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_custom_domain ON public.users(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant);

-- Update existing users to have tenant = 'main'
UPDATE public.users SET tenant = 'main' WHERE tenant IS NULL;

