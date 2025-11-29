-- Create payment_methods table to store user payment methods (Stripe)
-- This stores references to Stripe payment methods, not actual card numbers

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL,
  stripe_customer_id TEXT, -- Stripe customer ID for this user
  card_brand TEXT, -- visa, mastercard, amex, etc.
  card_last4 TEXT, -- Last 4 digits of card
  card_exp_month INTEGER, -- Expiration month (1-12)
  card_exp_year INTEGER, -- Expiration year (e.g., 2025)
  is_default BOOLEAN DEFAULT false,
  billing_email TEXT,
  billing_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_stripe_payment_method UNIQUE(stripe_payment_method_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_customer ON public.payment_methods(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON public.payment_methods(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON public.payment_methods(is_active);

-- Add comments
COMMENT ON TABLE public.payment_methods IS 'Stores user payment methods (Stripe payment method references)';
COMMENT ON COLUMN public.payment_methods.stripe_payment_method_id IS 'Stripe payment method ID (pm_xxx)';
COMMENT ON COLUMN public.payment_methods.stripe_customer_id IS 'Stripe customer ID (cus_xxx) - created when first payment method is added';
COMMENT ON COLUMN public.payment_methods.card_last4 IS 'Last 4 digits of card for display purposes';
COMMENT ON COLUMN public.payment_methods.is_default IS 'Whether this is the default payment method for the user';

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment methods
CREATE POLICY "Users can view their own payment methods"
  ON public.payment_methods
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own payment methods
CREATE POLICY "Users can insert their own payment methods"
  ON public.payment_methods
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own payment methods
CREATE POLICY "Users can update their own payment methods"
  ON public.payment_methods
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own payment methods
CREATE POLICY "Users can delete their own payment methods"
  ON public.payment_methods
  FOR DELETE
  USING (user_id = auth.uid());

-- Policy: Admins can view all payment methods
CREATE POLICY "Admins can view all payment methods"
  ON public.payment_methods
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Create function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this payment method as default
  IF NEW.is_default = true THEN
    -- Unset all other payment methods for this user as default
    UPDATE public.payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure single default
CREATE TRIGGER ensure_single_default_payment_method_trigger
  BEFORE INSERT OR UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- Add stripe_customer_id to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN stripe_customer_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
    COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe customer ID (cus_xxx)';
  END IF;
END $$;
