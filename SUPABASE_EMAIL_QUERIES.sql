-- ============================================
-- SUPABASE SQL QUERIES FOR EMAIL ISSUE
-- Run these in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CHECK: See which users have emails in auth but missing in users table
-- ============================================
SELECT 
    au.id,
    au.email as auth_email,
    au.created_at as auth_created,
    u.name,
    u.contact->>'email' as users_table_email,
    u.contact as full_contact_object,
    CASE 
        WHEN u.contact->>'email' IS NULL OR u.contact->>'email' = '' THEN 'MISSING'
        WHEN u.contact->>'email' != au.email THEN 'MISMATCH'
        ELSE 'OK'
    END as email_status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE au.email IS NOT NULL
ORDER BY au.created_at DESC;

-- ============================================
-- 2. FIX: Update users.contact.email from auth.users.email
-- (Only updates users where contact.email is NULL or empty)
-- ============================================
UPDATE public.users u
SET contact = COALESCE(u.contact, '{}'::jsonb) || 
    jsonb_build_object('email', au.email)
FROM auth.users au
WHERE u.id = au.id
  AND au.email IS NOT NULL
  AND (u.contact->>'email' IS NULL OR u.contact->>'email' = '');

-- Check how many rows were updated
SELECT COUNT(*) as updated_count
FROM public.users u
INNER JOIN auth.users au ON u.id = au.id
WHERE au.email IS NOT NULL
  AND u.contact->>'email' = au.email;

-- ============================================
-- 3. FIX: Update ALL users.contact.email from auth.users.email
-- (Overwrites existing contact.email with auth email - use with caution!)
-- ============================================
UPDATE public.users u
SET contact = COALESCE(u.contact, '{}'::jsonb) || 
    jsonb_build_object('email', au.email)
FROM auth.users au
WHERE u.id = au.id
  AND au.email IS NOT NULL;

-- ============================================
-- 4. CHECK: See users with their email status
-- ============================================
SELECT 
    u.id,
    u.name,
    au.email as auth_email,
    u.contact->>'email' as contact_email,
    u.role,
    u.is_active,
    u.plan,
    CASE 
        WHEN u.contact->>'email' IS NULL THEN '❌ No email in contact'
        WHEN u.contact->>'email' = '' THEN '❌ Empty email in contact'
        WHEN u.contact->>'email' != au.email THEN '⚠️ Email mismatch'
        ELSE '✅ Email OK'
    END as status
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
ORDER BY u.created_on DESC;

-- ============================================
-- 5. CHECK: Find your specific user (Wave Runner Test)
-- ============================================
SELECT 
    u.id,
    u.name,
    au.email as auth_email,
    u.contact->>'email' as contact_email,
    u.role,
    u.is_active,
    u.plan,
    u.created_on
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.name ILIKE '%Wave Runner%' 
   OR u.name ILIKE '%wave%runner%'
   OR au.email ILIKE '%your-email%'  -- Replace with your actual email
ORDER BY u.created_on DESC;

-- ============================================
-- 6. FIX: Activate your account (set is_active = true)
-- Replace 'YOUR_USER_ID' with your actual user ID from query #5
-- ============================================
UPDATE public.users
SET is_active = true
WHERE id = 'YOUR_USER_ID_HERE';  -- Replace with your user ID

-- Or activate by email:
UPDATE public.users u
SET is_active = true
FROM auth.users au
WHERE u.id = au.id
  AND au.email = 'your-email@example.com';  -- Replace with your email

-- ============================================
-- 7. CHECK: Count users by status
-- ============================================
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN u.contact->>'email' IS NOT NULL AND u.contact->>'email' != '' THEN 1 END) as users_with_contact_email,
    COUNT(CASE WHEN au.email IS NOT NULL THEN 1 END) as users_with_auth_email,
    COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN u.is_active = false OR u.is_active IS NULL THEN 1 END) as inactive_users
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id;

-- ============================================
-- 8. ONE-TIME FIX: Sync all emails and activate all users
-- (Use with caution - this updates ALL users)
-- ============================================
-- Step 1: Update emails
UPDATE public.users u
SET contact = COALESCE(u.contact, '{}'::jsonb) || 
    jsonb_build_object('email', au.email)
FROM auth.users au
WHERE u.id = au.id
  AND au.email IS NOT NULL;

-- Step 2: Activate all users (optional - remove if you don't want this)
UPDATE public.users
SET is_active = true
WHERE is_active IS NULL OR is_active = false;

-- ============================================
-- RECOMMENDED: Run these in order
-- ============================================
-- 1. First run query #1 to see the problem
-- 2. Then run query #5 to find your user
-- 3. Run query #2 to fix missing emails
-- 4. Run query #6 to activate your account
-- 5. Run query #4 to verify everything is fixed



