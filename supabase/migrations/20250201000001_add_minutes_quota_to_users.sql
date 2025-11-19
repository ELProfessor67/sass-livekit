-- Add minutes quota fields to public.users table
-- This enables tracking of call minutes for billing/quota management

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS minutes_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.users.minutes_limit IS 'Total minutes allocated to the user account';
COMMENT ON COLUMN public.users.minutes_used IS 'Total minutes consumed from calls';

-- Create index for better query performance on minutes queries
CREATE INDEX IF NOT EXISTS idx_users_minutes_limit ON public.users(minutes_limit) 
WHERE minutes_limit > 0;

-- Set default values for existing users (optional - can be set via admin later)
-- UPDATE public.users 
-- SET minutes_limit = 1000, minutes_used = 0 
-- WHERE minutes_limit IS NULL OR minutes_limit = 0;



