-- =====================================================
-- Fix RLS Policy for plan_configs to allow viewing tenant plans
-- This allows unauthenticated users (during signup/onboarding) 
-- to view plans based on tenant from URL/hostname
-- =====================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view active plan configs" ON public.plan_configs;

-- New policy: Allow viewing active plans for:
-- 1. Main tenant plans (tenant IS NULL) - everyone can see
-- 2. Tenant-specific plans - everyone can see (we'll filter client-side by tenant from URL)
-- This is safe because plan configs don't contain sensitive data
CREATE POLICY "Users can view active plan configs"
  ON public.plan_configs
  FOR SELECT
  USING (is_active = true);

-- Alternative: More restrictive policy that still allows tenant plans
-- If you want to be more restrictive, you can use this instead:
/*
CREATE POLICY "Users can view active plan configs"
  ON public.plan_configs
  FOR SELECT
  USING (
    is_active = true AND (
      -- Main tenant plans (everyone can see)
      tenant IS NULL OR
      -- Tenant-specific plans (everyone can see - filtering happens client-side)
      tenant IS NOT NULL
    )
  );
*/

-- Note: The client-side code will filter plans by tenant from URL
-- This RLS policy just ensures active plans are visible
-- Security: Plan configs are public pricing info, so this is safe


