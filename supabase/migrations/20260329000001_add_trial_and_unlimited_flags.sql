-- Add trial and unlimited flags to database
-- Migration Date: 2026-03-29

-- 1. Update minutes_pricing_config with trial settings
ALTER TABLE public.minutes_pricing_config 
ADD COLUMN IF NOT EXISTS free_trial_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS free_trial_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_trial_days INTEGER DEFAULT 7;

-- 2. Update users table with is_unlimited flag
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT false;

-- 3. Update plan_configs table with is_unlimited flag
ALTER TABLE public.plan_configs 
ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT false;

-- 4. Backfill is_unlimited for existing users with 0 limit
-- Note: In the previous system, 0 meant unlimited.
UPDATE public.users 
SET is_unlimited = true 
WHERE (minutes_limit = 0 OR minutes_limit IS NULL) 
AND (minutes_used = 0 OR minutes_used IS NULL);

-- 5. Add trial_ends_at to users if not already present (already exists but ensuring)
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- 6. Update RLS policies (if needed, but usually existing ones cover new columns)
COMMENT ON COLUMN public.minutes_pricing_config.free_trial_enabled IS 'Whether to allow new signups to get a free trial for this tenant';
COMMENT ON COLUMN public.minutes_pricing_config.free_trial_minutes IS 'Number of minutes awarded in the free trial';
COMMENT ON COLUMN public.minutes_pricing_config.free_trial_days IS 'Number of days the free trial lasts';
COMMENT ON COLUMN public.users.is_unlimited IS 'If true, this user has infinite calling minutes regardless of limit';
COMMENT ON COLUMN public.plan_configs.is_unlimited IS 'If true, subscribers to this plan automatically get unlimited minutes';
