-- Add minutes_purchased_total to users table to track lifetime purchases
-- Also reset all users to 0 minutes as per requirements

-- Add column to track total lifetime minutes purchased
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS minutes_purchased_total INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.users.minutes_purchased_total IS 'Total lifetime minutes purchased by the user (excluding promotional/manual additions)';

-- Reset all users to 0 minutes (as per user requirement)
-- This is a breaking change - all existing minute balances will be cleared
UPDATE public.users
SET 
  minutes_limit = 0,
  minutes_used = 0,
  minutes_purchased_total = 0,
  updated_at = NOW();

-- Create function to update minutes_purchased_total when purchases are completed
CREATE OR REPLACE FUNCTION update_user_minutes_purchased_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Only count completed purchases that were actually paid for
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Only increment if it's a paid purchase (not promotional/manual with $0)
    IF NEW.amount_paid > 0 THEN
      UPDATE public.users
      SET 
        minutes_purchased_total = COALESCE(minutes_purchased_total, 0) + NEW.minutes_purchased,
        updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  -- Subtract from total if refunded
  IF NEW.status = 'refunded' AND OLD.status = 'completed' AND NEW.amount_paid > 0 THEN
    UPDATE public.users
    SET 
      minutes_purchased_total = GREATEST(0, COALESCE(minutes_purchased_total, 0) - NEW.minutes_purchased),
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_user_minutes_purchased_total_trigger
  AFTER INSERT OR UPDATE ON public.minutes_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_user_minutes_purchased_total();
