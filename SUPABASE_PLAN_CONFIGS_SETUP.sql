-- =====================================================
-- Plan Configuration Setup Script
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Create plan_configs table
CREATE TABLE IF NOT EXISTS public.plan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  minutes_limit INTEGER NOT NULL DEFAULT 0, -- 0 means unlimited
  features JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of feature strings
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plan_configs_key ON public.plan_configs(plan_key);
CREATE INDEX IF NOT EXISTS idx_plan_configs_active ON public.plan_configs(is_active);

-- Step 3: Add comments for documentation
COMMENT ON TABLE public.plan_configs IS 'Dynamic plan configurations that can be modified by admins';
COMMENT ON COLUMN public.plan_configs.plan_key IS 'Unique identifier for the plan (e.g., starter, professional, enterprise, free)';
COMMENT ON COLUMN public.plan_configs.minutes_limit IS 'Minutes allocated per month. 0 means unlimited';
COMMENT ON COLUMN public.plan_configs.features IS 'JSON array of feature strings';

-- Step 4: Enable Row Level Security
ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Admins can view plan configs" ON public.plan_configs;
DROP POLICY IF EXISTS "Admins can insert plan configs" ON public.plan_configs;
DROP POLICY IF EXISTS "Admins can update plan configs" ON public.plan_configs;
DROP POLICY IF EXISTS "Admins can delete plan configs" ON public.plan_configs;
DROP POLICY IF EXISTS "Users can view active plan configs" ON public.plan_configs;

-- Step 6: Create RLS Policies

-- Policy: Only admins can read all plan configs
CREATE POLICY "Admins can view plan configs"
  ON public.plan_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can insert plan configs
CREATE POLICY "Admins can insert plan configs"
  ON public.plan_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can update plan configs
CREATE POLICY "Admins can update plan configs"
  ON public.plan_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can delete plan configs
CREATE POLICY "Admins can delete plan configs"
  ON public.plan_configs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: All authenticated users can read active plan configs (for pricing display)
CREATE POLICY "Users can view active plan configs"
  ON public.plan_configs
  FOR SELECT
  USING (is_active = true);

-- Step 7: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_plan_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_plan_configs_updated_at ON public.plan_configs;
CREATE TRIGGER update_plan_configs_updated_at
  BEFORE UPDATE ON public.plan_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_configs_updated_at();

-- Step 9: Seed initial plan data
-- Note: ON CONFLICT DO NOTHING means if plans already exist, they won't be overwritten
INSERT INTO public.plan_configs (plan_key, name, price, minutes_limit, features, display_order) VALUES
  ('free', 'Free', 0, 100, '["Up to 100 minutes/month", "Basic features", "Community support"]'::jsonb, 0),
  ('starter', 'Starter', 19, 500, '["Up to 500 calls/month", "Basic analytics", "Email support", "2 team members", "Standard integrations"]'::jsonb, 1),
  ('professional', 'Professional', 49, 2500, '["Up to 2,500 calls/month", "Advanced analytics & reporting", "Priority support", "10 team members", "All integrations", "Custom branding"]'::jsonb, 2),
  ('enterprise', 'Enterprise', 99, 0, '["Unlimited calls", "Real-time analytics", "24/7 phone support", "Unlimited team members", "Enterprise integrations", "Advanced security", "Dedicated account manager"]'::jsonb, 3)
ON CONFLICT (plan_key) DO NOTHING;

-- Step 10: Verify the data was inserted
SELECT 
  plan_key,
  name,
  price,
  minutes_limit,
  features,
  is_active,
  display_order,
  created_at
FROM public.plan_configs
ORDER BY display_order;

-- =====================================================
-- Optional: Update existing plans (uncomment if needed)
-- =====================================================
-- UPDATE public.plan_configs 
-- SET 
--   name = 'Starter',
--   price = 19,
--   minutes_limit = 500,
--   features = '["Up to 500 calls/month", "Basic analytics", "Email support", "2 team members", "Standard integrations"]'::jsonb
-- WHERE plan_key = 'starter';

-- =====================================================
-- Optional: View all plans with formatted output
-- =====================================================
-- SELECT 
--   plan_key as "Plan Key",
--   name as "Plan Name",
--   CONCAT('$', price) as "Price/Month",
--   CASE 
--     WHEN minutes_limit = 0 THEN 'Unlimited'
--     ELSE CONCAT(minutes_limit::text, ' minutes')
--   END as "Minutes Limit",
--   jsonb_array_length(features) as "Feature Count",
--   is_active as "Active"
-- FROM public.plan_configs
-- ORDER BY display_order;



