-- Create workflow_folders table
CREATE TABLE IF NOT EXISTS public.workflow_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add folder_id to workflows
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.workflow_folders(id) ON DELETE SET NULL;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'unsorted';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'scratch';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS is_starter BOOLEAN DEFAULT false;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS completed_count INTEGER DEFAULT 0;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.workflow_folders ENABLE ROW LEVEL SECURITY;

-- Policies for workflow_folders
CREATE POLICY "Users can view their own folders"
    ON public.workflow_folders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
    ON public.workflow_folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
    ON public.workflow_folders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
    ON public.workflow_folders FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_workflow_folders_updated_at
    BEFORE UPDATE ON public.workflow_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
