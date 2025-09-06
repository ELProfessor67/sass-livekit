-- Fix ON CONFLICT error by adding unique constraint on phone_number.number
-- Run this query directly in your Supabase SQL editor or database client

-- Step 1: Check for duplicate phone numbers first
SELECT 
    number, 
    COUNT(*) as duplicate_count,
    array_agg(id) as duplicate_ids
FROM public.phone_number
GROUP BY number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: If duplicates exist, keep only the most recent record for each phone number
-- (Uncomment the following lines if you have duplicates and want to clean them up)
/*
DELETE FROM public.phone_number
WHERE id NOT IN (
    SELECT DISTINCT ON (number) id
    FROM public.phone_number
    ORDER BY number, created_at DESC
);
*/

-- Step 3: Add unique constraint on the number column
ALTER TABLE public.phone_number 
ADD CONSTRAINT unique_phone_number UNIQUE (number);

-- Step 4: Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.phone_number'::regclass 
AND conname = 'unique_phone_number';

-- Step 5: Test the constraint works
-- This should succeed (insert new record)
INSERT INTO public.phone_number (number, phone_sid, label, status) 
VALUES ('+1234567890', 'test_sid_1', 'Test Number 1', 'active');

-- This should fail with unique constraint violation (duplicate number)
-- INSERT INTO public.phone_number (number, phone_sid, label, status) 
-- VALUES ('+1234567890', 'test_sid_2', 'Test Number 2', 'active');

-- Clean up test data
-- DELETE FROM public.phone_number WHERE phone_sid = 'test_sid_1';
