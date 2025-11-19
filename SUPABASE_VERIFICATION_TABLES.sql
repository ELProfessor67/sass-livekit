-- =====================================================
-- Verification Tables and User Settings Setup
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create verification tokens table for email verification
CREATE TABLE IF NOT EXISTS public.verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_token UNIQUE(user_id, token)
);

-- Create verification OTPs table for password reset
CREATE TABLE IF NOT EXISTS public.verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_reset_token UNIQUE(user_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON public.verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON public.verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON public.verification_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_verification_otps_user_email ON public.verification_otps(user_email);
CREATE INDEX IF NOT EXISTS idx_verification_otps_otp ON public.verification_otps(otp);
CREATE INDEX IF NOT EXISTS idx_verification_otps_expires_at ON public.verification_otps(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Add settings fields to users table if they don't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS daily_summary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS call_summary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_email TEXT;

-- Enable Row Level Security
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own verification tokens" ON public.verification_tokens;
DROP POLICY IF EXISTS "Service role full access verification_tokens" ON public.verification_tokens;
DROP POLICY IF EXISTS "Service role full access verification_otps" ON public.verification_otps;
DROP POLICY IF EXISTS "Service role full access password_reset_tokens" ON public.password_reset_tokens;

-- Policy: Users can only see their own verification tokens (though they shouldn't need to)
CREATE POLICY "Users can view own verification tokens" ON public.verification_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for backend operations)
-- Note: Service role bypasses RLS, but we add these for clarity
CREATE POLICY "Service role full access verification_tokens" ON public.verification_tokens
  FOR ALL USING (true);

CREATE POLICY "Service role full access verification_otps" ON public.verification_otps
  FOR ALL USING (true);

CREATE POLICY "Service role full access password_reset_tokens" ON public.password_reset_tokens
  FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.verification_tokens IS 'Stores email verification tokens for user account activation';
COMMENT ON TABLE public.verification_otps IS 'Stores OTP codes for password reset';
COMMENT ON TABLE public.password_reset_tokens IS 'Stores tokens for password reset after OTP verification';
COMMENT ON COLUMN public.users.daily_summary IS 'Whether user wants to receive daily call summaries';
COMMENT ON COLUMN public.users.call_summary IS 'Whether user wants to receive individual call summaries';
COMMENT ON COLUMN public.users.summary_email IS 'Email address to send summaries to (if different from account email)';

-- =====================================================
-- Verification Complete!
-- =====================================================
-- You can verify the tables were created by running:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('verification_tokens', 'verification_otps', 'password_reset_tokens');
-- =====================================================



