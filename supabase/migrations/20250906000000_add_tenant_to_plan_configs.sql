-- Add tenant support to plan_configs table
-- This allows whitelabel admins to customize their own payment plans

-- Add tenant column (NULL means global/main tenant plans)
ALTER TABLE public.plan_configs
ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.plan_configs.tenant IS 'Tenant identifier - NULL for main tenant plans, slug_name for whitelabel tenant plans';

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_plan_configs_tenant ON public.plan_configs(tenant) WHERE tenant IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plan_configs_tenant_key ON public.plan_configs(tenant, plan_key) WHERE tenant IS NOT NULL;

-- Update unique constraint to allow same plan_key for different tenants
-- First, drop the existing unique constraint on plan_key
ALTER TABLE public.plan_configs
DROP CONSTRAINT IF EXISTS plan_configs_plan_key_key;

-- Add new unique constraint: plan_key must be unique per tenant (NULL tenant = main)
CREATE UNIQUE INDEX IF NOT EXISTS plan_configs_tenant_plan_key_unique 
ON public.plan_configs(COALESCE(tenant, 'main'), plan_key);

-- Update RLS policies to support tenant filtering
-- Policy: Users can view active plan configs for their tenant or main tenant
DROP POLICY IF EXISTS "Users can view active plan configs" ON public.plan_configs;
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

-- Policy: Whitelabel admins can manage their own tenant's plans
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

-- Update existing plans to be main tenant plans (tenant = NULL)
UPDATE public.plan_configs 
SET tenant = NULL 
WHERE tenant IS NULL;


