-- Backfill minutes_used for all users based on historical call data
-- This calculates total minutes used from call_history table
-- Run this query in Supabase SQL Editor

-- Step 1: Calculate total minutes used per user from call_history
-- Join call_history -> assistant -> user to get user_id
-- Convert call_duration (seconds) to minutes (round up)
WITH user_call_minutes AS (
  SELECT 
    a.user_id,
    COALESCE(SUM(CEIL(ch.call_duration::numeric / 60.0)), 0) as total_minutes_used
  FROM public.call_history ch
  INNER JOIN public.assistant a ON ch.assistant_id = a.id
  WHERE ch.call_duration IS NOT NULL 
    AND ch.call_duration > 0
    AND a.user_id IS NOT NULL
  GROUP BY a.user_id
)

-- Step 2: Update users table with calculated minutes_used
UPDATE public.users u
SET minutes_used = ucm.total_minutes_used
FROM user_call_minutes ucm
WHERE u.id = ucm.user_id
  AND (u.minutes_used IS NULL OR u.minutes_used = 0 OR u.minutes_used < ucm.total_minutes_used);

-- Step 3: Ensure minutes_used is never NULL (set to 0 for users with no calls)
UPDATE public.users
SET minutes_used = 0
WHERE minutes_used IS NULL;

-- Verification: Check the results
SELECT 
  u.id,
  u.name,
  u.email,
  u.plan,
  u.minutes_limit,
  u.minutes_used,
  u.minutes_limit - u.minutes_used as remaining_minutes,
  COUNT(ch.id) as total_calls,
  COALESCE(SUM(ch.call_duration), 0) as total_call_seconds,
  COALESCE(SUM(CEIL(ch.call_duration::numeric / 60.0)), 0) as calculated_minutes
FROM public.users u
LEFT JOIN public.assistant a ON a.user_id = u.id
LEFT JOIN public.call_history ch ON ch.assistant_id = a.id
WHERE u.minutes_used > 0 OR EXISTS (
  SELECT 1 
  FROM public.assistant a2 
  INNER JOIN public.call_history ch2 ON ch2.assistant_id = a2.id 
  WHERE a2.user_id = u.id
)
GROUP BY u.id, u.name, u.email, u.plan, u.minutes_limit, u.minutes_used
ORDER BY u.minutes_used DESC
LIMIT 20;

-- Summary statistics
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN minutes_used > 0 THEN 1 END) as users_with_usage,
  SUM(minutes_used) as total_minutes_used,
  AVG(minutes_used) as avg_minutes_used,
  MAX(minutes_used) as max_minutes_used
FROM public.users;


