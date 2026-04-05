-- Add per-plan price_per_minute override to plan_configs
-- NULL means fall back to the global rate in minutes_pricing_config
ALTER TABLE public.plan_configs
  ADD COLUMN IF NOT EXISTS price_per_minute NUMERIC(10, 4) DEFAULT NULL;

COMMENT ON COLUMN public.plan_configs.price_per_minute IS
  'Per-minute rate for pay-as-you-go purchases on this plan. NULL = falls back to the global rate in minutes_pricing_config.';
