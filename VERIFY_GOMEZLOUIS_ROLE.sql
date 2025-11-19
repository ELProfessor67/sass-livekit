-- =====================================================
-- Verify gomezlouis admin role after fix
-- =====================================================

-- Check the public.users table to verify admin role
SELECT 
  id,
  name,
  contact->>'email' as email,
  slug_name,
  tenant,
  role,
  minutes_limit,
  is_active,
  created_on
FROM public.users
WHERE id = 'c5c9abcf-64bd-4c1a-892b-bed0c4bdbc19';

-- Expected values:
-- ✅ slug_name: 'gomezlouis'
-- ✅ tenant: 'gomezlouis'  
-- ✅ role: 'admin' (NOT 'user')
-- ✅ is_active: true

-- If role is still 'user' or NULL, run FIX_GOMEZLOUIS_ADMIN_ROLE.sql


