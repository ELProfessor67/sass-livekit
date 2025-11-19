# Backfill Minutes for Existing Users

## Overview

This migration backfills `minutes_limit` for all existing users in the database based on their current plan.

## What It Does

The migration (`20250902000000_backfill_minutes_based_on_plan.sql`) will:

1. **Set minutes for Free plan users**: 100 minutes
2. **Set minutes for Starter plan users**: 500 minutes
3. **Set minutes for Professional plan users**: 2,500 minutes
4. **Set minutes for Enterprise plan users**: 0 (unlimited)
5. **Handle users without a plan**: Defaults to Free (100 minutes)
6. **Ensure minutes_used is never NULL**: Sets to 0 if NULL

## Plan Minutes Allocation

| Plan | Minutes/Month |
|------|--------------|
| Free (or NULL) | 100 |
| Starter | 500 |
| Professional | 2,500 |
| Enterprise | 0 (Unlimited) |

## Running the Migration

### Option 1: Via Supabase CLI
```bash
supabase migration up
```

### Option 2: Via Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the migration SQL
3. Run the query

### Option 3: Direct SQL
```sql
-- Run the SQL from the migration file directly in your database
```

## Verification

After running the migration, verify the results:

```sql
-- Check distribution of minutes by plan
SELECT 
  plan,
  COUNT(*) as user_count,
  MIN(minutes_limit) as min_minutes,
  MAX(minutes_limit) as max_minutes,
  AVG(minutes_limit) as avg_minutes
FROM public.users
GROUP BY plan
ORDER BY plan;

-- Check users without minutes allocated (should be 0 after migration)
SELECT COUNT(*) 
FROM public.users 
WHERE minutes_limit IS NULL OR minutes_limit = 0 AND plan != 'enterprise';

-- Check specific user
SELECT id, plan, minutes_limit, minutes_used 
FROM public.users 
WHERE id = 'user-id-here';
```

## Important Notes

1. **Existing minutes_used is preserved**: The migration only sets `minutes_limit`, it doesn't reset `minutes_used` unless it's NULL
2. **Enterprise users**: Will have `minutes_limit = 0` (unlimited)
3. **Users without plan**: Will default to Free plan (100 minutes)
4. **Safe to run multiple times**: The migration uses conditions to only update users who need it

## Rollback

If you need to rollback, you can reset all minutes:

```sql
-- Reset all minutes (use with caution!)
UPDATE public.users
SET minutes_limit = 0, minutes_used = 0;
```

## After Migration

Once the migration is complete:
- ✅ All existing users will have minutes allocated based on their plan
- ✅ New users will automatically get minutes during onboarding
- ✅ Users upgrading plans will get new minutes allocation
- ✅ The system is ready for plan-based minutes tracking



