-- Make legacy columns nullable to support the new node-based architecture
-- These columns were inherited from the old 'webhooks' table
ALTER TABLE public.workflows ALTER COLUMN url DROP NOT NULL;
ALTER TABLE public.workflows ALTER COLUMN method DROP NOT NULL;
ALTER TABLE public.workflows ALTER COLUMN fields DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.workflows.url IS 'Legacy column from webhooks. No longer strictly required for new node-based workflows.';
COMMENT ON COLUMN public.workflows.method IS 'Legacy column from webhooks. No longer strictly required for new node-based workflows.';
COMMENT ON COLUMN public.workflows.fields IS 'Legacy column from webhooks. No longer strictly required for new node-based workflows.';
