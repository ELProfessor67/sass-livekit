-- =====================================================
-- Add Tenant Columns to All Tables
-- Run this in Supabase SQL Editor
-- This adds tenant column to all tables that need data isolation
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assistant_tenant ON public.assistant(tenant);
CREATE INDEX IF NOT EXISTS idx_call_history_tenant ON public.call_history(tenant);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON public.campaigns(tenant);
CREATE INDEX IF NOT EXISTS idx_campaign_calls_tenant ON public.campaign_calls(tenant);
CREATE INDEX IF NOT EXISTS idx_call_queue_tenant ON public.call_queue(tenant);

-- Add comments
COMMENT ON COLUMN public.assistant.tenant IS 'Tenant identifier for data isolation';
COMMENT ON COLUMN public.call_history.tenant IS 'Tenant identifier for data isolation';
COMMENT ON COLUMN public.campaigns.tenant IS 'Tenant identifier for data isolation';
COMMENT ON COLUMN public.campaign_calls.tenant IS 'Tenant identifier for data isolation';
COMMENT ON COLUMN public.call_queue.tenant IS 'Tenant identifier for data isolation';

-- =====================================================
-- Migration Complete!
-- =====================================================
-- Verify by running:
-- SELECT table_name, column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND column_name = 'tenant';
-- =====================================================



