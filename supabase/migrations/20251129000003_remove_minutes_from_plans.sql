-- Remove minutes_limit from plan_configs table
-- Minutes are now purchased separately, not tied to subscription plans

-- First, let's add a comment to document the change
COMMENT ON TABLE public.plan_configs IS 'Dynamic plan configurations for subscription features and pricing. Minutes are now purchased separately via pay-as-you-go system.';

-- Drop the minutes_limit column from plan_configs
ALTER TABLE public.plan_configs 
DROP COLUMN IF EXISTS minutes_limit;

-- Update existing plan features to remove minute references
-- This is optional - you may want to keep feature descriptions as-is
UPDATE public.plan_configs
SET features = (
  SELECT jsonb_agg(feature)
  FROM jsonb_array_elements_text(features) AS feature
  WHERE feature NOT LIKE '%minute%' 
    AND feature NOT LIKE '%call%/month'
)
WHERE features IS NOT NULL;

-- Add a note about minutes being sold separately
UPDATE public.plan_configs
SET features = 
  CASE 
    WHEN features IS NULL THEN '["Minutes purchased separately"]'::jsonb
    ELSE features || '["Minutes purchased separately"]'::jsonb
  END
WHERE NOT EXISTS (
  SELECT 1 
  FROM jsonb_array_elements_text(features) AS feature
  WHERE feature = 'Minutes purchased separately'
);
