-- Add Activepieces folder ID to users table for isolation
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS activepieces_folder_id TEXT;
