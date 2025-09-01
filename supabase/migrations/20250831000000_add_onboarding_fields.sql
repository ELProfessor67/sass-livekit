-- Add onboarding fields to public.users
-- Stores onboarding preferences and completion flag

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS team_size text,
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS use_case text,
ADD COLUMN IF NOT EXISTS theme text,
ADD COLUMN IF NOT EXISTS notifications boolean,
ADD COLUMN IF NOT EXISTS goals json,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Ensure update policy allows users to update these fields (policy assumed existing)


