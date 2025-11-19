-- Create plan_configs table for dynamic plan management
-- This allows admins to modify plan prices and minutes without code changes

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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plan_configs_key ON public.plan_configs(plan_key);
CREATE INDEX IF NOT EXISTS idx_plan_configs_active ON public.plan_configs(is_active);

-- Add comments
COMMENT ON TABLE public.plan_configs IS 'Dynamic plan configurations that can be modified by admins';
COMMENT ON COLUMN public.plan_configs.plan_key IS 'Unique identifier for the plan (e.g., starter, professional, enterprise, free)';
COMMENT ON COLUMN public.plan_configs.minutes_limit IS 'Minutes allocated per month. 0 means unlimited';
COMMENT ON COLUMN public.plan_configs.features IS 'JSON array of feature strings';

-- Enable RLS
ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read plan configs
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_plan_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_plan_configs_updated_at
  BEFORE UPDATE ON public.plan_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_configs_updated_at();

-- Seed initial plan data
INSERT INTO public.plan_configs (plan_key, name, price, minutes_limit, features, display_order) VALUES
  ('free', 'Free', 0, 100, '["Up to 100 minutes/month", "Basic features", "Community support"]'::jsonb, 0),
  ('starter', 'Starter', 19, 500, '["Up to 500 calls/month", "Basic analytics", "Email support", "2 team members", "Standard integrations"]'::jsonb, 1),
  ('professional', 'Professional', 49, 2500, '["Up to 2,500 calls/month", "Advanced analytics & reporting", "Priority support", "10 team members", "All integrations", "Custom branding"]'::jsonb, 2),
  ('enterprise', 'Enterprise', 99, 0, '["Unlimited calls", "Real-time analytics", "24/7 phone support", "Unlimited team members", "Enterprise integrations", "Advanced security", "Dedicated account manager"]'::jsonb, 3)
ON CONFLICT (plan_key) DO NOTHING;



