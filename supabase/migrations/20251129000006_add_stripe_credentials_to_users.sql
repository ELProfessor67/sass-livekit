-- Add Stripe credentials for whitelabel admins
-- These credentials are used to process payments on their custom domain

DO $$ 
BEGIN
  -- Add stripe_publishable_key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'stripe_publishable_key'
  ) THEN
    ALTER TABLE public.users ADD COLUMN stripe_publishable_key TEXT;
    COMMENT ON COLUMN public.users.stripe_publishable_key IS 'Stripe publishable key for whitelabel admin (pk_xxx)';
  END IF;

  -- Add stripe_secret_key column (encrypted)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'stripe_secret_key'
  ) THEN
    ALTER TABLE public.users ADD COLUMN stripe_secret_key TEXT;
    COMMENT ON COLUMN public.users.stripe_secret_key IS 'Stripe secret key for whitelabel admin (sk_xxx) - should be encrypted';
  END IF;

  -- Add stripe_account_id column (for Stripe Connect)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'stripe_account_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN stripe_account_id TEXT;
    COMMENT ON COLUMN public.users.stripe_account_id IS 'Stripe Connect account ID for whitelabel admin (acct_xxx)';
  END IF;

  -- Add stripe_enabled flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'stripe_enabled'
  ) THEN
    ALTER TABLE public.users ADD COLUMN stripe_enabled BOOLEAN DEFAULT false;
    COMMENT ON COLUMN public.users.stripe_enabled IS 'Whether Stripe is configured and enabled for this whitelabel admin';
  END IF;
END $$;

-- Create indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_account ON public.users(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_stripe_enabled ON public.users(stripe_enabled) WHERE stripe_enabled = true;

-- Add RLS policy for whitelabel admins to update their own Stripe credentials
-- Note: Users can only update their own Stripe credentials
CREATE POLICY IF NOT EXISTS "Users can update their own Stripe credentials"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Security note: In production, stripe_secret_key should be encrypted at rest
-- Consider using Supabase Vault or a separate secure storage solution
COMMENT ON COLUMN public.users.stripe_secret_key IS 
  'SECURITY: This should be encrypted. Consider using Supabase Vault or external key management.';
