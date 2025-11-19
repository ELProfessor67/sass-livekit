-- =====================================================
-- FIX TENANT ASSIGNMENT FOR USERS
-- =====================================================
-- This script updates the database trigger to handle tenant from hostname
-- and provides queries to fix existing users with incorrect tenants
-- =====================================================

-- 1. Update the trigger function to handle tenant from metadata
-- This ensures new signups get the correct tenant based on hostname
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_slug TEXT;
  is_whitelabel BOOLEAN;
  user_role TEXT;
  user_tenant TEXT;
BEGIN
  -- Extract white label data from metadata
  user_slug := NEW.raw_user_meta_data->>'slug';
  is_whitelabel := (NEW.raw_user_meta_data->>'whitelabel')::boolean;
  user_tenant := NEW.raw_user_meta_data->>'tenant';
  
  -- Set role to admin if white label, otherwise default
  IF is_whitelabel AND user_slug IS NOT NULL THEN
    user_role := 'admin';
  ELSE
    user_role := 'user';
  END IF;
  
  -- Determine tenant: use from metadata if provided, otherwise use slug, otherwise default to main
  IF user_tenant IS NOT NULL THEN
    -- Tenant explicitly provided in metadata (e.g., from hostname extraction)
    user_tenant := user_tenant;
  ELSIF user_slug IS NOT NULL THEN
    -- White label admin: tenant = slug
    user_tenant := user_slug;
  ELSE
    -- Default to main
    user_tenant := 'main';
  END IF;
  
  INSERT INTO public.users (
    id, 
    name,
    slug_name,
    tenant,
    role
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    user_slug,
    user_tenant,
    user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug_name = COALESCE(EXCLUDED.slug_name, users.slug_name),
    tenant = COALESCE(EXCLUDED.tenant, users.tenant),
    role = COALESCE(EXCLUDED.role, users.role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. QUERIES TO FIX EXISTING USERS
-- =====================================================

-- 2a. Check users with tenant = 'main' but should have a different tenant
-- (This helps identify users that need fixing)
SELECT 
  u.id,
  u.email,
  u.name,
  u.tenant,
  u.slug_name,
  u.role,
  u.created_at,
  -- Check if there's a tenant owner that matches a potential subdomain
  (SELECT slug_name FROM users WHERE slug_name IS NOT NULL AND role = 'admin' LIMIT 1) as potential_tenant
FROM users u
WHERE u.tenant = 'main'
  AND u.slug_name IS NULL
  AND u.role = 'user'
ORDER BY u.created_at DESC;

-- 2b. Find users that might belong to a specific tenant
-- Replace 'gomezlouis' with the actual tenant slug you want to check
SELECT 
  u.id,
  u.email,
  u.name,
  u.tenant,
  u.slug_name,
  u.role,
  u.created_at
FROM users u
WHERE u.tenant = 'main'
  AND u.slug_name IS NULL
  AND u.role = 'user'
  -- Add any other criteria to identify users that should belong to a specific tenant
ORDER BY u.created_at DESC;

-- 2c. Update a specific user's tenant (e.g., "andria")
-- Replace 'USER_EMAIL_OR_ID' with the actual user email or ID
-- Replace 'gomezlouis' with the correct tenant
UPDATE users
SET tenant = 'gomezlouis'
WHERE (email = 'andria@example.com' OR id = 'USER_ID_HERE')
  AND tenant = 'main'
  AND slug_name IS NULL;

-- 2d. Update all users that should belong to a specific tenant
-- WARNING: Use with caution! Make sure you know which users should belong to which tenant
-- Replace 'gomezlouis' with the correct tenant slug
-- Add WHERE conditions to identify the specific users
/*
UPDATE users
SET tenant = 'gomezlouis'
WHERE tenant = 'main'
  AND slug_name IS NULL
  AND role = 'user'
  -- Add additional conditions here to identify the users
  -- For example: AND created_at > '2024-01-01'
  -- Or: AND email LIKE '%@specificdomain.com'
;
*/

-- =====================================================
-- 3. VERIFICATION QUERIES
-- =====================================================

-- 3a. Check tenant distribution
SELECT 
  tenant,
  COUNT(*) as user_count,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_user_count
FROM users
GROUP BY tenant
ORDER BY user_count DESC;

-- 3b. Check users by tenant (e.g., 'gomezlouis')
SELECT 
  id,
  email,
  name,
  tenant,
  slug_name,
  role,
  created_at
FROM users
WHERE tenant = 'gomezlouis'
ORDER BY created_at DESC;

-- 3c. Check for users with tenant = 'main' that might be incorrectly assigned
SELECT 
  u.id,
  u.email,
  u.name,
  u.tenant,
  u.slug_name,
  u.role,
  u.created_at,
  au.raw_user_meta_data->>'tenant' as metadata_tenant
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.tenant = 'main'
  AND u.slug_name IS NULL
ORDER BY u.created_at DESC;

-- =====================================================
-- 4. FIX SPECIFIC USER (Example: andria)
-- =====================================================

-- First, find the user
SELECT id, email, name, tenant, slug_name, role
FROM users
WHERE email LIKE '%andria%' OR name LIKE '%andria%';

-- Then update the tenant (replace with actual values from above query)
-- UPDATE users
-- SET tenant = 'gomezlouis'
-- WHERE id = 'USER_ID_FROM_ABOVE_QUERY';


