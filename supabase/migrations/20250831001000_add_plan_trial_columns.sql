-- Add plan and trial fields to public.users

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS plan text,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;


