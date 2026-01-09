-- Rename webhooks table to workflows and add node-based columns
ALTER TABLE IF EXISTS public.webhooks RENAME TO workflows;

-- Ensure the table exists if starting fresh
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID REFERENCES public.assistant(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    nodes JSONB NOT NULL DEFAULT '[]', -- For visual workflow nodes
    edges JSONB NOT NULL DEFAULT '[]', -- For visual workflow connections
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns to workflows if it already existed but was renamed
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS nodes JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS edges JSONB NOT NULL DEFAULT '[]';

-- Rename columns if they were there from 'webhooks' but we don't need them anymore
-- (Actually, we'll keep them for now to avoid breaking existing data if any, 
-- but nodes/edges will take precedence)

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Re-create policies (renaming automatically handles table name change, but let's be safe)
DROP POLICY IF EXISTS "Users can view their own webhooks" ON public.workflows;
DROP POLICY IF EXISTS "Users can create their own webhooks" ON public.workflows;
DROP POLICY IF EXISTS "Users can update their own webhooks" ON public.workflows;
DROP POLICY IF EXISTS "Users can delete their own webhooks" ON public.workflows;

CREATE POLICY "Users can view their own workflows"
    ON public.workflows FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
    ON public.workflows FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
    ON public.workflows FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
    ON public.workflows FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for update_at
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON public.workflows;
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
