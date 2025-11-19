-- =====================================================
-- QUICK FIX: Update andria's tenant to gomezlouis
-- =====================================================

-- Step 1: Find andria user
SELECT 
  id, 
  email, 
  name, 
  tenant, 
  slug_name, 
  role,
  created_at
FROM users
WHERE 
  (email ILIKE '%andria%' OR name ILIKE '%andria%')
  AND tenant = 'main';

-- Step 2: Update andria's tenant (replace USER_ID with the id from Step 1)
-- Uncomment and run after verifying the user from Step 1
/*
UPDATE users
SET tenant = 'gomezlouis'
WHERE id = 'USER_ID_FROM_STEP_1'
  AND tenant = 'main';
*/

-- =====================================================
-- ALTERNATIVE: Update by email directly
-- =====================================================
-- Replace 'andria@example.com' with andria's actual email
/*
UPDATE users
SET tenant = 'gomezlouis'
WHERE email = 'andria@example.com'
  AND tenant = 'main';
*/

-- =====================================================
-- VERIFY: Check the update worked
-- =====================================================
SELECT 
  id, 
  email, 
  name, 
  tenant, 
  slug_name, 
  role
FROM users
WHERE 
  (email ILIKE '%andria%' OR name ILIKE '%andria%');


