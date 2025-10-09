-- Script to create the first admin user
-- Run this after the migration to create your first admin

-- Example: Create a super admin user
-- Replace the values below with your actual admin details

-- Method 1: Using Supabase Auth Admin API (recommended)
-- This should be done through your application or Supabase dashboard

-- Method 2: Direct database insert (for initial setup only)
-- WARNING: This bypasses auth, use only for initial setup

-- First, you'll need to create the auth user through Supabase Auth
-- Then update the role in the public.users table

-- Example SQL to update an existing user to admin:
-- UPDATE public.users 
-- SET role = 'admin' 
-- WHERE contact->>'email' = 'your-admin-email@example.com';

-- Or if you know the user ID:
-- UPDATE public.users 
-- SET role = 'admin' 
-- WHERE id = 'your-user-id-here';

-- To verify admin access:
-- SELECT id, name, contact->>'email' as email, role, is_active 
-- FROM public.users 
-- WHERE role = 'admin';
