-- Verify and fix the trigger to ensure whitelabel_customer_sale records NEVER add minutes
-- This migration ensures the trigger function is correct and handles all edge cases

CREATE OR REPLACE FUNCTION public.add_purchased_minutes_to_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- CRITICAL: Skip if this is a debit transaction (whitelabel customer sale)
  -- This MUST be the first check to prevent any minutes from being added
  IF NEW.payment_method = 'whitelabel_customer_sale' THEN
    RETURN NEW; -- Exit early - do NOT add minutes
  END IF;
  
  -- Also skip if payment_method is NULL and it's a debit (safety check)
  -- But only if we can identify it as a debit from other fields
  -- For now, we'll be strict: only skip explicit whitelabel_customer_sale
  
  -- Only add minutes when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.users
    SET 
      minutes_limit = COALESCE(minutes_limit, 0) + NEW.minutes_purchased,
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  -- Subtract minutes if refunded
  IF NEW.status = 'refunded' AND OLD.status = 'completed' THEN
    UPDATE public.users
    SET 
      minutes_limit = GREATEST(0, COALESCE(minutes_limit, 0) - NEW.minutes_purchased),
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the trigger exists and is attached
DO $$
BEGIN
  -- Check if trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'add_purchased_minutes_to_user_trigger'
  ) THEN
    -- Create trigger if it doesn't exist
    CREATE TRIGGER add_purchased_minutes_to_user_trigger
      AFTER INSERT OR UPDATE ON public.minutes_purchases
      FOR EACH ROW
      EXECUTE FUNCTION public.add_purchased_minutes_to_user();
  END IF;
END $$;

-- Add comment to document the behavior
COMMENT ON FUNCTION public.add_purchased_minutes_to_user() IS 
'Adds minutes to user minutes_limit when purchase is completed. 
SKIPS records with payment_method = whitelabel_customer_sale (debit transactions).
This prevents whitelabel admins from gaining minutes when their customers purchase.';

