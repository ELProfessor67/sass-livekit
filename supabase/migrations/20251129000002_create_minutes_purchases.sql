-- Create minutes purchases table for tracking user minute purchases
-- This table records all minute purchase transactions

CREATE TABLE IF NOT EXISTS public.minutes_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minutes_purchased INTEGER NOT NULL CHECK (minutes_purchased > 0),
  amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid >= 0),
  currency TEXT DEFAULT 'USD',
  payment_method TEXT, -- 'stripe', 'manual', 'promotional', etc.
  payment_id TEXT, -- Stripe payment intent ID or other payment reference
  stripe_session_id TEXT, -- Stripe checkout session ID
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  notes TEXT, -- Admin notes for manual/promotional additions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_minutes_purchases_user_id ON public.minutes_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_minutes_purchases_created_at ON public.minutes_purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_minutes_purchases_status ON public.minutes_purchases(status);
CREATE INDEX IF NOT EXISTS idx_minutes_purchases_payment_id ON public.minutes_purchases(payment_id) WHERE payment_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE public.minutes_purchases IS 'Records of all minute purchase transactions';
COMMENT ON COLUMN public.minutes_purchases.user_id IS 'User who purchased the minutes';
COMMENT ON COLUMN public.minutes_purchases.minutes_purchased IS 'Number of minutes purchased in this transaction';
COMMENT ON COLUMN public.minutes_purchases.amount_paid IS 'Amount paid in the specified currency';
COMMENT ON COLUMN public.minutes_purchases.payment_method IS 'Payment method used (stripe, manual, promotional, etc.)';
COMMENT ON COLUMN public.minutes_purchases.payment_id IS 'External payment reference (e.g., Stripe payment intent ID)';
COMMENT ON COLUMN public.minutes_purchases.status IS 'Transaction status: pending, completed, failed, refunded, cancelled';
COMMENT ON COLUMN public.minutes_purchases.notes IS 'Admin notes for manual or promotional additions';

-- Enable RLS
ALTER TABLE public.minutes_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own purchase history
CREATE POLICY "Users can view their own purchases"
  ON public.minutes_purchases
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can create their own purchase records (via API)
CREATE POLICY "Users can create their own purchases"
  ON public.minutes_purchases
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Admins can view all purchases
CREATE POLICY "Admins can view all purchases"
  ON public.minutes_purchases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can create purchases for any user (for manual additions)
CREATE POLICY "Admins can create purchases for users"
  ON public.minutes_purchases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can update purchase status (for refunds, etc.)
CREATE POLICY "Admins can update purchases"
  ON public.minutes_purchases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_minutes_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_minutes_purchases_updated_at
  BEFORE UPDATE ON public.minutes_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_minutes_purchases_updated_at();

-- Create function to update user minutes_limit when purchase is completed
CREATE OR REPLACE FUNCTION add_purchased_minutes_to_user()
RETURNS TRIGGER AS $$
BEGIN
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

-- Create trigger to automatically update user minutes
CREATE TRIGGER add_purchased_minutes_to_user_trigger
  AFTER INSERT OR UPDATE ON public.minutes_purchases
  FOR EACH ROW
  EXECUTE FUNCTION add_purchased_minutes_to_user();
