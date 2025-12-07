-- Fix double-crediting issue for Stripe webhook purchases
-- The webhook handler in server/index.js already credits minutes directly,
-- so the trigger should skip records with payment_method = 'stripe_webhook'
-- to prevent double-crediting

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
  
  -- CRITICAL: Skip if this is a Stripe webhook purchase (minutes already added by webhook handler)
  -- The webhook handler in server/index.js already credits minutes directly,
  -- so we must skip these to prevent double-crediting
  IF NEW.payment_method = 'stripe_webhook' THEN
    RETURN NEW; -- Exit early - do NOT add minutes (already handled by webhook)
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

-- Update comment
COMMENT ON FUNCTION public.add_purchased_minutes_to_user() IS 
'Adds minutes to user minutes_limit when purchase is completed. 
SKIPS records with payment_method = whitelabel_customer_sale (debit transactions).
SKIPS records with payment_method = stripe_webhook (minutes already added by webhook handler).
Uses OLD.status check to ensure it only fires once per INSERT with status=completed.
This prevents double-counting when inserting records with status=completed directly.';


