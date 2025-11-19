-- ============================================
-- MINUTES VERIFICATION QUERIES
-- Run these after adding minutes columns
-- ============================================

-- ============================================
-- 1. Verify minutes allocation by plan
-- ============================================
SELECT 
  COALESCE(plan, 'No Plan') as plan,
  COUNT(*) as user_count,
  MIN(minutes_limit) as min_minutes,
  MAX(minutes_limit) as max_minutes,
  ROUND(AVG(minutes_limit), 2) as avg_minutes,
  SUM(CASE WHEN minutes_limit = 0 THEN 1 ELSE 0 END) as unlimited_users,
  SUM(CASE WHEN minutes_limit > 0 THEN 1 ELSE 0 END) as limited_users,
  SUM(minutes_used) as total_minutes_used,
  SUM(minutes_limit) as total_minutes_allocated
FROM public.users
GROUP BY plan
ORDER BY 
  CASE COALESCE(plan, '')
    WHEN 'Free' THEN 1
    WHEN 'free' THEN 1
    WHEN 'Starter' THEN 2
    WHEN 'starter' THEN 2
    WHEN 'Professional' THEN 3
    WHEN 'professional' THEN 3
    WHEN 'Pro' THEN 3
    WHEN 'pro' THEN 3
    WHEN 'Enterprise' THEN 4
    WHEN 'enterprise' THEN 4
    ELSE 5
  END,
  plan;

-- ============================================
-- 2. Check for any users still without minutes (should return 0 rows after migration)
-- Note: minutes_limit = 0 means UNLIMITED, not "no minutes"
-- ============================================
SELECT 
  id, 
  name,
  COALESCE(plan, 'No Plan') as plan, 
  minutes_limit, 
  minutes_used,
  CASE 
    WHEN minutes_limit = 0 THEN 'Unlimited'
    WHEN minutes_limit IS NULL THEN '❌ NULL (needs fix)'
    ELSE minutes_limit::text || ' minutes'
  END as minutes_status,
  CASE 
    WHEN minutes_limit > 0 THEN minutes_limit - minutes_used
    ELSE NULL
  END as remaining_minutes
FROM public.users 
WHERE minutes_limit IS NULL  -- Only check for NULL, 0 is valid (unlimited)
ORDER BY created_on DESC;

-- ============================================
-- 3. Users with minutes usage breakdown
-- ============================================
SELECT 
  id,
  name,
  COALESCE(plan, 'No Plan') as plan,
  minutes_limit,
  minutes_used,
  CASE 
    WHEN minutes_limit = 0 THEN 'Unlimited'
    WHEN minutes_limit > 0 THEN minutes_limit - minutes_used
    ELSE NULL
  END as remaining_minutes,
  CASE 
    WHEN minutes_limit = 0 THEN 0
    WHEN minutes_limit > 0 THEN ROUND((minutes_used::numeric / minutes_limit::numeric) * 100, 2)
    ELSE NULL
  END as usage_percentage,
  CASE 
    WHEN minutes_limit > 0 AND minutes_used >= minutes_limit THEN '⚠️ Exceeded'
    WHEN minutes_limit > 0 AND minutes_used >= (minutes_limit * 0.9) THEN '🔴 Critical (90%+)'
    WHEN minutes_limit > 0 AND minutes_used >= (minutes_limit * 0.75) THEN '🟡 Warning (75%+)'
    WHEN minutes_limit = 0 THEN '✅ Unlimited'
    WHEN minutes_limit > 0 THEN '🟢 OK'
    ELSE '❓ Unknown'
  END as status
FROM public.users
WHERE minutes_limit IS NOT NULL
ORDER BY 
  CASE 
    WHEN minutes_limit > 0 AND minutes_used >= minutes_limit THEN 1
    WHEN minutes_limit > 0 AND minutes_used >= (minutes_limit * 0.9) THEN 2
    WHEN minutes_limit > 0 AND minutes_used >= (minutes_limit * 0.75) THEN 3
    ELSE 4
  END,
  minutes_used DESC;

-- ============================================
-- 4. Summary statistics
-- ============================================
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN minutes_limit IS NULL THEN 1 END) as users_with_null_minutes,
  COUNT(CASE WHEN minutes_limit = 0 THEN 1 END) as unlimited_users,
  COUNT(CASE WHEN minutes_limit > 0 THEN 1 END) as limited_users,
  SUM(CASE WHEN minutes_limit > 0 THEN minutes_limit ELSE 0 END) as total_minutes_allocated,
  SUM(minutes_used) as total_minutes_used,
  SUM(CASE WHEN minutes_limit > 0 THEN minutes_limit - minutes_used ELSE 0 END) as total_remaining_minutes,
  COUNT(CASE WHEN minutes_limit > 0 AND minutes_used >= minutes_limit THEN 1 END) as users_exceeded_limit,
  COUNT(CASE WHEN minutes_limit > 0 AND minutes_used >= (minutes_limit * 0.9) THEN 1 END) as users_at_90_percent
FROM public.users;

-- ============================================
-- 5. Fix any NULL minutes_limit (shouldn't happen with DEFAULT 0, but just in case)
-- ============================================
UPDATE public.users
SET 
  minutes_limit = COALESCE(minutes_limit, 0),
  minutes_used = COALESCE(minutes_used, 0)
WHERE minutes_limit IS NULL OR minutes_used IS NULL;

-- Verify the fix
SELECT COUNT(*) as null_minutes_fixed
FROM public.users
WHERE minutes_limit IS NULL OR minutes_used IS NULL;
-- Should return 0



