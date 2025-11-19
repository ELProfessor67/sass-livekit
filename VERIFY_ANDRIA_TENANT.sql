-- =====================================================
-- Verify and Fix andria's Tenant Data
-- =====================================================

-- Step 1: Check andria's current data
SELECT 
  id,
  name,
  email,
  tenant,
  slug_name,
  role,
  created_at
FROM users
WHERE id = '8e7153c1-8af5-47ab-8de3-d91a866ba66b'
   OR email = 'andriajulie746@gmail.com'
   OR name ILIKE '%andria%';

-- Expected values for andria (whitelabel customer):
-- tenant: 'gomezlouis' ✅ (correct)
-- slug_name: NULL ✅ (correct - she's a customer, not an admin)
-- role: 'user' or 'CEO/Founder' (role doesn't affect visibility)

-- =====================================================
-- Step 2: Verify the filtering logic will work
-- =====================================================
-- For super-admin to NOT see andria, we need:
-- - tenant != 'main' ✅ (tenant = 'gomezlouis')
-- - slug_name IS NULL ✅ (slug_name = NULL)
-- This means: isMainTenant = FALSE, isWhitelabelAdmin = FALSE
-- Result: Should be EXCLUDED ✅

-- =====================================================
-- Step 3: Check if there are any other issues
-- =====================================================
-- Verify gomez (whitelabel admin) data
SELECT 
  id,
  name,
  email,
  tenant,
  slug_name,
  role
FROM users
WHERE slug_name = 'gomezlouis'
   OR email = 'gomezlouis786@gmail.com';

-- Expected values for gomez (whitelabel admin):
-- tenant: 'gomezlouis'
-- slug_name: 'gomezlouis' (should NOT be NULL)
-- role: 'admin'

-- =====================================================
-- Step 4: If needed, ensure andria's data is correct
-- =====================================================
-- Make sure tenant is set correctly (should already be 'gomezlouis')
-- UPDATE users
-- SET tenant = 'gomezlouis'
-- WHERE id = '8e7153c1-8af5-47ab-8de3-d91a866ba66b'
--   AND tenant != 'gomezlouis';

-- Make sure slug_name is NULL (should already be NULL)
-- UPDATE users
-- SET slug_name = NULL
-- WHERE id = '8e7153c1-8af5-47ab-8de3-d91a866ba66b'
--   AND slug_name IS NOT NULL;

-- =====================================================
-- Step 5: Test the visibility logic
-- =====================================================
-- This query simulates what super-admin should see
SELECT 
  id,
  name,
  email,
  tenant,
  slug_name,
  role,
  CASE 
    WHEN tenant = 'main' THEN 'Visible to super-admin (main tenant)'
    WHEN slug_name IS NOT NULL THEN 'Visible to super-admin (whitelabel admin)'
    ELSE 'NOT visible to super-admin (whitelabel customer)'
  END as visibility_status
FROM users
WHERE tenant = 'main' OR slug_name IS NOT NULL
ORDER BY tenant, name;

-- andria should NOT appear in this list


