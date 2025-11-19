-- =====================================================
-- Add Tenant Support to plan_configs Table
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Add tenant column (NULL means global/main tenant plans)
ALTER TABLE public.plan_configs
ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT NULL;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN public.plan_configs.tenant IS 'Tenant identifier - NULL for main tenant plans, slug_name for whitelabel tenant plans';

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plan_configs_tenant ON public.plan_configs(tenant) WHERE tenant IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plan_configs_tenant_key ON public.plan_configs(tenant, plan_key) WHERE tenant IS NOT NULL;

-- Step 4: Update unique constraint to allow same plan_key for different tenants
-- Drop the existing unique constraint on plan_key
ALTER TABLE public.plan_configs
DROP CONSTRAINT IF EXISTS plan_configs_plan_key_key;

-- Add new unique constraint: plan_key must be unique per tenant (NULL tenant = main)
CREATE UNIQUE INDEX IF NOT EXISTS plan_configs_tenant_plan_key_unique 
ON public.plan_configs(COALESCE(tenant, 'main'), plan_key);

-- Step 5: Update RLS policies to support tenant filtering
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view active plan configs" ON public.plan_configs;

-- Policy: Users can view active plan configs for their tenant or main tenant
CREATE POLICY "Users can view active plan configs"
  ON public.plan_configs
  FOR SELECT
  USING (
    is_active = true AND (
      -- Main tenant plans (tenant IS NULL)
      tenant IS NULL OR
      -- Whitelabel tenant plans (tenant = user's tenant)
      tenant = (
        SELECT COALESCE(slug_name, 'main') 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

-- Step 6: Policy for admins to manage tenant-specific plans
DROP POLICY IF EXISTS "Whitelabel admins can manage tenant plans" ON public.plan_configs;

CREATE POLICY "Whitelabel admins can manage tenant plans"
  ON public.plan_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND (
        -- Main tenant admin can manage main tenant plans (tenant IS NULL)
        (users.tenant = 'main' AND users.slug_name IS NULL AND plan_configs.tenant IS NULL) OR
        -- Whitelabel admin can manage their own tenant plans
        (users.slug_name = plan_configs.tenant AND plan_configs.tenant IS NOT NULL)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND (
        -- Main tenant admin can manage main tenant plans (tenant IS NULL)
        (users.tenant = 'main' AND users.slug_name IS NULL AND plan_configs.tenant IS NULL) OR
        -- Whitelabel admin can manage their own tenant plans
        (users.slug_name = plan_configs.tenant AND plan_configs.tenant IS NOT NULL)
      )
    )
  );

-- Step 7: Ensure existing plans are marked as main tenant plans (tenant = NULL)
UPDATE public.plan_configs 
SET tenant = NULL 
WHERE tenant IS NULL;

-- =====================================================
-- Verification Queries (Optional - run to verify)
-- =====================================================

-- Check all plan configs with their tenant
-- SELECT plan_key, name, price, tenant, is_active 
-- FROM public.plan_configs 
-- ORDER BY COALESCE(tenant, 'main'), display_order;

-- Check if unique constraint is working
-- SELECT COALESCE(tenant, 'main') as tenant_group, plan_key, COUNT(*) 
-- FROM public.plan_configs 
-- GROUP BY COALESCE(tenant, 'main'), plan_key 
-- HAVING COUNT(*) > 1;
-- (Should return 0 rows if constraint is working)


