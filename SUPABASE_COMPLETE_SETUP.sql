-- =====================================================
-- Complete Database Setup for sass-livekit
-- Run this entire script in Supabase SQL Editor
-- This includes: Verification tables + Tenant columns
-- =====================================================

-- =====================================================
-- PART 1: Verification Tables
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

-- Add indexes for verification tables
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON public.verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON public.verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON public.verification_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_verification_otps_user_email ON public.verification_otps(user_email);
CREATE INDEX IF NOT EXISTS idx_verification_otps_otp ON public.verification_otps(otp);
CREATE INDEX IF NOT EXISTS idx_verification_otps_expires_at ON public.verification_otps(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Enable Row Level Security for verification tables
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own verification tokens" ON public.verification_tokens;
DROP POLICY IF EXISTS "Service role full access verification_tokens" ON public.verification_tokens;
DROP POLICY IF EXISTS "Service role full access verification_otps" ON public.verification_otps;
DROP POLICY IF EXISTS "Service role full access password_reset_tokens" ON public.password_reset_tokens;

-- Policy: Users can only see their own verification tokens
CREATE POLICY "Users can view own verification tokens" ON public.verification_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for backend operations)
CREATE POLICY "Service role full access verification_tokens" ON public.verification_tokens
  FOR ALL USING (true);

CREATE POLICY "Service role full access verification_otps" ON public.verification_otps
  FOR ALL USING (true);

CREATE POLICY "Service role full access password_reset_tokens" ON public.password_reset_tokens
  FOR ALL USING (true);

-- =====================================================
-- PART 2: Add Settings Fields to Users Table
-- =====================================================

-- Add settings fields to users table if they don't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS daily_summary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS call_summary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_email TEXT;

-- =====================================================
-- PART 3: Add Tenant Columns to All Tables
-- =====================================================

-- Add tenant column to assistant table
ALTER TABLE public.assistant
ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';

-- Add tenant column to call_history table
ALTER TABLE public.call_history
ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';

-- Add tenant column to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';

-- Add tenant column to campaign_calls table
ALTER TABLE public.campaign_calls
ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';

-- Add tenant column to call_queue table
ALTER TABLE public.call_queue
ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';

-- Add tenant column to contacts table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';
    END IF;
END $$;

-- Add tenant column to knowledge_bases table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'knowledge_bases') THEN
        ALTER TABLE public.knowledge_bases ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';
    END IF;
END $$;

-- Add tenant column to knowledge_documents table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'knowledge_documents') THEN
        ALTER TABLE public.knowledge_documents ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';
    END IF;
END $$;

-- Add tenant column to phone_numbers table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'phone_numbers') THEN
        ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';
    END IF;
END $$;

-- Add tenant column to sms_messages table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sms_messages') THEN
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';
    END IF;
END $$;

-- Update existing records to have tenant = 'main' if NULL
UPDATE public.assistant SET tenant = 'main' WHERE tenant IS NULL;
UPDATE public.call_history SET tenant = 'main' WHERE tenant IS NULL;
UPDATE public.campaigns SET tenant = 'main' WHERE tenant IS NULL;
UPDATE public.campaign_calls SET tenant = 'main' WHERE tenant IS NULL;
UPDATE public.call_queue SET tenant = 'main' WHERE tenant IS NULL;

-- Create indexes for tenant columns (better query performance)
CREATE INDEX IF NOT EXISTS idx_assistant_tenant ON public.assistant(tenant);
CREATE INDEX IF NOT EXISTS idx_call_history_tenant ON public.call_history(tenant);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON public.campaigns(tenant);
CREATE INDEX IF NOT EXISTS idx_campaign_calls_tenant ON public.campaign_calls(tenant);
CREATE INDEX IF NOT EXISTS idx_call_queue_tenant ON public.call_queue(tenant);

-- =====================================================
-- PART 4: Add Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.verification_tokens IS 'Stores email verification tokens for user account activation';
COMMENT ON TABLE public.verification_otps IS 'Stores OTP codes for password reset';
COMMENT ON TABLE public.password_reset_tokens IS 'Stores tokens for password reset after OTP verification';
COMMENT ON COLUMN public.users.daily_summary IS 'Whether user wants to receive daily call summaries';
COMMENT ON COLUMN public.users.call_summary IS 'Whether user wants to receive individual call summaries';
COMMENT ON COLUMN public.users.summary_email IS 'Email address to send summaries to (if different from account email)';
COMMENT ON COLUMN public.assistant.tenant IS 'Tenant identifier for data isolation';
COMMENT ON COLUMN public.call_history.tenant IS 'Tenant identifier for data isolation';
COMMENT ON COLUMN public.campaigns.tenant IS 'Tenant identifier for data isolation';
COMMENT ON COLUMN public.campaign_calls.tenant IS 'Tenant identifier for data isolation';
COMMENT ON COLUMN public.call_queue.tenant IS 'Tenant identifier for data isolation';

-- =====================================================
-- Verification Queries (Optional - Run to verify)
-- =====================================================

-- Verify verification tables were created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('verification_tokens', 'verification_otps', 'password_reset_tokens');

-- Verify tenant columns were added:
-- SELECT table_name, column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND column_name = 'tenant'
-- ORDER BY table_name;

-- Verify settings columns were added:
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name = 'users'
-- AND column_name IN ('daily_summary', 'call_summary', 'summary_email');

-- =====================================================
-- Setup Complete! ✅
-- =====================================================
-- This script has:
-- 1. Created verification tables for email verification and password reset
-- 2. Added user settings columns (daily_summary, call_summary, summary_email)
-- 3. Added tenant columns to all data tables for multi-tenant isolation
-- 4. Created indexes for better performance
-- 5. Set up Row Level Security policies
-- 6. Updated existing records to have tenant = 'main'
-- =====================================================



