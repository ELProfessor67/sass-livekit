-- Add whitelabel flag to plan_configs so admins can control access per plan

ALTER TABLE public.plan_configs
ADD COLUMN IF NOT EXISTS whitelabel_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.plan_configs.whitelabel_enabled IS 'When true, subscriptions on this plan unlock Whitelabel features.';

-- Ensure existing rows have an explicit value (important if column already existed without default)
UPDATE public.plan_configs
SET whitelabel_enabled = COALESCE(whitelabel_enabled, false);


