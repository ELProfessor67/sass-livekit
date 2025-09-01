-- Allow authenticated users to insert their own profile row in public.users
-- This fixes FK errors when creating related records (e.g., assistant)

-- Ensure RLS is enabled (it already is in prior migrations, but safe to call)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Insert policy: user can insert a row where id = auth.uid()
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
WITH CHECK (id = auth.uid());

-- Optional: allow upsert updates to the same row by the owner (already present for UPDATE in prior migrations)
-- The existing update policy allows users to update their own profile with USING (auth.uid() = id)

