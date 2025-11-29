-- Fix potential double-counting issue by ensuring trigger only fires once per INSERT
-- Check for duplicate triggers and ensure proper trigger configuration

-- First, check if there are duplicate triggers (shouldn't happen, but let's be safe)
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname = 'add_purchased_minutes_to_user_trigger'
    AND tgrelid = 'public.minutes_purchases'::regclass;
    
    IF trigger_count > 1 THEN
        RAISE WARNING 'Found % duplicate triggers with name add_purchased_minutes_to_user_trigger. This could cause double-counting!', trigger_count;
        -- Drop all but one
        DELETE FROM pg_trigger
        WHERE tgname = 'add_purchased_minutes_to_user_trigger'
        AND tgrelid = 'public.minutes_purchases'::regclass
        AND ctid NOT IN (
            SELECT MIN(ctid)
            FROM pg_trigger
            WHERE tgname = 'add_purchased_minutes_to_user_trigger'
            AND tgrelid = 'public.minutes_purchases'::regclass
        );
    END IF;
END $$;

-- Ensure the trigger function is idempotent and only adds minutes once
-- Add additional safety check to prevent double-counting
CREATE OR REPLACE FUNCTION public.add_purchased_minutes_to_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_limit INTEGER;
BEGIN
  -- CRITICAL: Skip if this is a debit transaction (whitelabel customer sale)
  -- This MUST be the first check to prevent any minutes from being added
  IF NEW.payment_method = 'whitelabel_customer_sale' THEN
    RETURN NEW; -- Exit early - do NOT add minutes
  END IF;
  
  -- Only add minutes when status changes to 'completed'
  -- IMPORTANT: Check OLD.status to ensure we only add once per INSERT
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Get current limit to verify we're not double-counting
    SELECT COALESCE(minutes_limit, 0) INTO current_limit
    FROM public.users
    WHERE id = NEW.user_id;
    
    -- Add minutes (this should only happen once per INSERT with status='completed')
    UPDATE public.users
    SET 
      minutes_limit = current_limit + NEW.minutes_purchased,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Log for debugging (can be removed in production)
    -- RAISE NOTICE 'Added % minutes to user %. New limit: %', 
    --   NEW.minutes_purchased, NEW.user_id, current_limit + NEW.minutes_purchased;
  END IF;
  
  -- Subtract minutes if refunded
  IF NEW.status = 'refunded' AND OLD IS NOT NULL AND OLD.status = 'completed' THEN
    UPDATE public.users
    SET 
      minutes_limit = GREATEST(0, COALESCE(minutes_limit, 0) - NEW.minutes_purchased),
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists and is properly configured
-- Drop and recreate to ensure clean state
DROP TRIGGER IF EXISTS add_purchased_minutes_to_user_trigger ON public.minutes_purchases;

CREATE TRIGGER add_purchased_minutes_to_user_trigger
  AFTER INSERT OR UPDATE ON public.minutes_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.add_purchased_minutes_to_user();

-- Add comment
COMMENT ON FUNCTION public.add_purchased_minutes_to_user() IS 
'Adds minutes to user minutes_limit when purchase is completed. 
SKIPS records with payment_method = whitelabel_customer_sale (debit transactions).
Uses OLD.status check to ensure it only fires once per INSERT with status=completed.
This prevents double-counting when inserting records with status=completed directly.';

