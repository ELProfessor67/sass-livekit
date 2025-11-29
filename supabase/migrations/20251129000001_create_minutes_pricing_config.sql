-- Create minutes pricing configuration table for pay-as-you-go system
-- This allows admins to set per-minute pricing for their tenant

CREATE TABLE IF NOT EXISTS public.minutes_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant TEXT NOT NULL DEFAULT 'main',
  price_per_minute NUMERIC(10, 4) NOT NULL DEFAULT 0.01,
  minimum_purchase INTEGER DEFAULT 0, -- 0 means no minimum
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_tenant_pricing UNIQUE(tenant)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_minutes_pricing_tenant ON public.minutes_pricing_config(tenant);
CREATE INDEX IF NOT EXISTS idx_minutes_pricing_active ON public.minutes_pricing_config(is_active);

-- Add comments
COMMENT ON TABLE public.minutes_pricing_config IS 'Per-minute pricing configuration for pay-as-you-go minutes system';
COMMENT ON COLUMN public.minutes_pricing_config.tenant IS 'Tenant identifier - "main" for main tenant, or slug_name for whitelabel tenants';
COMMENT ON COLUMN public.minutes_pricing_config.price_per_minute IS 'Price per minute in the specified currency (e.g., 0.01 = $0.01 per minute)';
COMMENT ON COLUMN public.minutes_pricing_config.minimum_purchase IS 'Minimum number of minutes that can be purchased. 0 means no minimum.';

-- Enable RLS
ALTER TABLE public.minutes_pricing_config ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all pricing configs
CREATE POLICY "Admins can view all pricing configs"
  ON public.minutes_pricing_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can manage their own tenant's pricing
CREATE POLICY "Admins can manage their tenant pricing"
  ON public.minutes_pricing_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND (
        -- Main tenant admin can manage main pricing
        (users.tenant = 'main' AND users.slug_name IS NULL AND minutes_pricing_config.tenant = 'main') OR
        -- Whitelabel admin can manage their tenant pricing
        (users.slug_name = minutes_pricing_config.tenant AND minutes_pricing_config.tenant IS NOT NULL)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND (
        (users.tenant = 'main' AND users.slug_name IS NULL AND minutes_pricing_config.tenant = 'main') OR
        (users.slug_name = minutes_pricing_config.tenant AND minutes_pricing_config.tenant IS NOT NULL)
      )
    )
  );

-- Policy: All authenticated users can view active pricing for their tenant
CREATE POLICY "Users can view active pricing"
  ON public.minutes_pricing_config
  FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (
        -- Users on main tenant see main pricing
        (users.tenant = 'main' AND minutes_pricing_config.tenant = 'main') OR
        -- Users on whitelabel tenant see their tenant pricing
        (users.tenant = minutes_pricing_config.tenant)
      )
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_minutes_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_minutes_pricing_updated_at
  BEFORE UPDATE ON public.minutes_pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_minutes_pricing_updated_at();

-- Seed default pricing for main tenant
INSERT INTO public.minutes_pricing_config (tenant, price_per_minute, minimum_purchase, currency) 
VALUES ('main', 0.01, 0, 'USD')
ON CONFLICT (tenant) DO NOTHING;
