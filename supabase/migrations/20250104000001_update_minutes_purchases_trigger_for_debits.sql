-- Update the trigger function to handle debit transactions (whitelabel customer sales)
-- Debit transactions should not add minutes to the user's limit

CREATE OR REPLACE FUNCTION public.add_purchased_minutes_to_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if this is a debit transaction (whitelabel customer sale)
  IF NEW.payment_method = 'whitelabel_customer_sale' THEN
    RETURN NEW;
  END IF;
  
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

