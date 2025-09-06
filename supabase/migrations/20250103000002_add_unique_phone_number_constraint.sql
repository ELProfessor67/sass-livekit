-- Add unique constraint on phone_number.number column
-- This fixes the ON CONFLICT error by ensuring phone numbers are unique

-- First, check if there are any duplicate phone numbers
-- If there are duplicates, we need to handle them before adding the constraint
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT number, COUNT(*) as cnt
        FROM public.phone_number
        GROUP BY number
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate phone numbers. Please resolve duplicates before adding unique constraint.', duplicate_count;
        -- For now, we'll keep the most recent record for each phone number
        DELETE FROM public.phone_number
        WHERE id NOT IN (
            SELECT DISTINCT ON (number) id
            FROM public.phone_number
            ORDER BY number, created_at DESC
        );
    END IF;
END $$;

-- Add unique constraint on the number column
ALTER TABLE public.phone_number 
ADD CONSTRAINT unique_phone_number UNIQUE (number);

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_phone_number ON public.phone_number 
IS 'Ensures each phone number can only be assigned once across the system';
