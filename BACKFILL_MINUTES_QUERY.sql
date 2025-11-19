-- Backfill minutes_limit for existing users based on their plan
-- Run this query in Supabase SQL Editor to allocate minutes to all existing users

-- Step 1: Update Free plan users (or users without a plan) - 100 minutes
UPDATE public.users
SET 
  minutes_limit = 100,
  minutes_used = COALESCE(minutes_used, 0)
WHERE 
  (plan IS NULL OR plan = 'free' OR plan = '')
  AND (minutes_limit IS NULL OR minutes_limit = 0);

-- Step 2: Update Starter plan users - 500 minutes
UPDATE public.users
SET 
  minutes_limit = 500,
  minutes_used = COALESCE(minutes_used, 0)
WHERE 
  plan = 'starter'
  AND (minutes_limit IS NULL OR minutes_limit = 0);

-- Step 3: Update Professional plan users - 2,500 minutes
UPDATE public.users
SET 
  minutes_limit = 2500,
  minutes_used = COALESCE(minutes_used, 0)
WHERE 
  plan = 'professional'
  AND (minutes_limit IS NULL OR minutes_limit = 0);

-- Step 4: Update Enterprise plan users - Unlimited (0 = unlimited)
UPDATE public.users
SET 
  minutes_limit = 0,
  minutes_used = COALESCE(minutes_used, 0)
WHERE 
  plan = 'enterprise'
  AND (minutes_limit IS NULL OR minutes_limit != 0);

-- Step 5: Ensure minutes_used is never NULL for any user
UPDATE public.users
SET minutes_used = 0
WHERE minutes_used IS NULL;

-- Verification: Check the results
SELECT 
  plan,
  COUNT(*) as user_count,
  MIN(minutes_limit) as min_minutes,
  MAX(minutes_limit) as max_minutes,
  SUM(CASE WHEN minutes_limit = 0 THEN 1 ELSE 0 END) as unlimited_users
FROM public.users
GROUP BY plan
ORDER BY 
  CASE plan
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'professional' THEN 3
    WHEN 'enterprise' THEN 4
    ELSE 5
  END;



