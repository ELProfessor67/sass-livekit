-- =====================================================
-- Fix gomezlouis admin role
-- This user should be admin of their slug 'gomezlouis'
-- Based on auth.users data: slug='gomezlouis', whitelabel=true
-- =====================================================

-- Step 1: Check current status in public.users table
SELECT 
  id,
  name,
  contact->>'email' as email,
  slug_name,
  tenant,
  role,
  minutes_limit,
  created_on,
  is_active
FROM public.users
WHERE slug_name = 'gomezlouis' OR id = 'c5c9abcf-64bd-4c1a-892b-bed0c4bdbc19';

-- Step 2: Check if user exists in public.users
-- If user doesn't exist, we may need to create the profile first
SELECT COUNT(*) as user_exists
FROM public.users
WHERE id = 'c5c9abcf-64bd-4c1a-892b-bed0c4bdbc19';

-- Step 3: Update to set correct role and ensure slug_name is set
-- This will update if user exists, or you may need to create the profile first
UPDATE public.users
SET 
  role = 'admin',
  slug_name = 'gomezlouis',
  tenant = 'gomezlouis'
WHERE id = 'c5c9abcf-64bd-4c1a-892b-bed0c4bdbc19';

-- Step 4: If user profile doesn't exist, create it
-- (Uncomment and run if Step 3 updated 0 rows)
/*
INSERT INTO public.users (
  id,
  name,
  contact,
  slug_name,
  tenant,
  role,
  is_active,
  created_on
)
VALUES (
  'c5c9abcf-64bd-4c1a-892b-bed0c4bdbc19',
  'gomez louis',
  '{"email": "gomezlouis786@gmail.com", "phone": "555555555", "countryCode": "+1"}'::jsonb,
  'gomezlouis',
  'gomezlouis',
  'admin',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  slug_name = 'gomezlouis',
  tenant = 'gomezlouis';
*/

-- Step 5: Verify the update
SELECT 
  id,
  name,
  contact->>'email' as email,
  slug_name,
  tenant,
  role,
  minutes_limit,
  created_on,
  is_active
FROM public.users
WHERE id = 'c5c9abcf-64bd-4c1a-892b-bed0c4bdbc19';

-- Expected result after fix:
-- - slug_name: 'gomezlouis' ✅
-- - tenant: 'gomezlouis' ✅
-- - role: 'admin' ✅
-- - is_active: true ✅

