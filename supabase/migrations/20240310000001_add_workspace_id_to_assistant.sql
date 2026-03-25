-- Add workspace_id to assistant table
ALTER TABLE public.assistant ADD COLUMN workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE;

-- Backfill existing assistants with their user's first workspace
UPDATE public.assistant a
SET workspace_id = (
  SELECT id 
  FROM public.workspace_settings ws 
  WHERE ws.user_id = a.user_id 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Update RLS policies for assistant table
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own assistants" ON public.assistant;
DROP POLICY IF EXISTS "Users can insert their own assistants" ON public.assistant;
DROP POLICY IF EXISTS "Users can update their own assistants" ON public.assistant;

-- Create new policies that include workspace checks
CREATE POLICY "Users can view assistants in their workspaces" 
ON public.assistant 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ) OR user_id = auth.uid()
);

CREATE POLICY "Users can insert assistants into their workspaces" 
ON public.assistant 
FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ) OR user_id = auth.uid()
);

CREATE POLICY "Users can update assistants in their workspaces" 
ON public.assistant 
FOR UPDATE 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ) OR user_id = auth.uid()
);

CREATE POLICY "Users can delete assistants in their workspaces" 
ON public.assistant 
FOR DELETE 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ) OR user_id = auth.uid()
);
