-- Add bio column to public.users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Update RLS policies (optional, but good to be sure)
-- Existing policies already cover all columns for the user themselves
COMMENT ON COLUMN public.users.bio IS 'Short biography or description for the user profile.';
