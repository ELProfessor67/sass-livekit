-- Backfill minutes_limit for existing users based on their plan
-- This migration ensures all existing users have minutes allocated based on their current plan

-- Update users based on their plan
-- Free plan: 100 minutes
UPDATE public.users
SET 
  minutes_limit = 100,
  minutes_used = COALESCE(minutes_used, 0)
WHERE 
  (plan IS NULL OR plan = 'free' OR plan = '')
  AND (minutes_limit IS NULL OR minutes_limit = 0);

-- Starter plan: 500 minutes
UPDATE public.users
SET 
  minutes_limit = 500,
  minutes_used = COALESCE(minutes_used, 0)
WHERE 
  plan = 'starter'
  AND (minutes_limit IS NULL OR minutes_limit = 0);

-- Professional plan: 2,500 minutes
UPDATE public.users
SET 
  minutes_limit = 2500,
  minutes_used = COALESCE(minutes_used, 0)
WHERE 
  plan = 'professional'
  AND (minutes_limit IS NULL OR minutes_limit = 0);

-- Enterprise plan: Unlimited (0 = unlimited)
UPDATE public.users
SET 
  minutes_limit = 0,
  minutes_used = COALESCE(minutes_used, 0)
WHERE 
  plan = 'enterprise'
  AND (minutes_limit IS NULL OR minutes_limit != 0);

-- Ensure minutes_used is never NULL
UPDATE public.users
SET minutes_used = 0
WHERE minutes_used IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.minutes_limit IS 'Total minutes allocated to the user account. 0 = unlimited. Set based on plan: Free=100, Starter=500, Professional=2500, Enterprise=0 (unlimited)';
COMMENT ON COLUMN public.users.minutes_used IS 'Total minutes consumed from calls. Reset to 0 when plan is upgraded.';



