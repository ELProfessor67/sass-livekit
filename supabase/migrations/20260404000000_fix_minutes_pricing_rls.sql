-- Fix RLS policies for minutes_pricing_config to allow public access to trial settings
-- Migration Date: 2026-04-04

-- 1. Allow public (anon) read access to specific trial-related columns
-- This is necessary for the onboarding flow to show the "Continue with Free" button 
-- before the user profile is fully established in public.users.

DROP POLICY IF EXISTS "Public can view trial settings" ON public.minutes_pricing_config;

CREATE POLICY "Public can view trial settings"
  ON public.minutes_pricing_config
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
  );

-- Note: We are allowing read access to all columns for simplicity as there is no 
-- sensitive data in this table (just pricing and trial flags).
-- If sensitive data is added in the future, this policy should be narrowed.

-- 2. Ensure default 'main' tenant row exists and has trial enabled if desired
-- We check if it exists first.
INSERT INTO public.minutes_pricing_config (tenant, price_per_minute, minimum_purchase, currency, is_active, free_trial_enabled, free_trial_minutes, free_trial_days)
VALUES ('main', 0.01, 0, 'USD', true, true, 30, 7)
ON CONFLICT (tenant) DO UPDATE SET
  is_active = true,
  free_trial_enabled = EXCLUDED.free_trial_enabled,
  free_trial_minutes = EXCLUDED.free_trial_minutes,
  free_trial_days = EXCLUDED.free_trial_days;

COMMENT ON POLICY "Public can view trial settings" ON public.minutes_pricing_config IS 'Allows anyone to view active pricing and trial configurations.';
