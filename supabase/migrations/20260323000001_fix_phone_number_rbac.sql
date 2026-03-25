-- Fix RBAC for phone_number table to be workspace-aware
-- Currently restricted to assistant.user_id = auth.uid(), which excludes workspace members/viewers

-- 1. DROP old policies
DROP POLICY IF EXISTS "Users can view phone numbers for their assistants" ON public.phone_number;
DROP POLICY IF EXISTS "Users can insert phone numbers for their assistants" ON public.phone_number;
DROP POLICY IF EXISTS "Users can update phone numbers for their assistants" ON public.phone_number;
DROP POLICY IF EXISTS "Users can delete phone numbers for their assistants" ON public.phone_number;

-- 2. CREATE new workspace-aware policies
-- These policies rely on joining with the assistant table which HAS a workspace_id

-- SELECT: Everyone in workspace can view numbers assigned to assistants in their workspace
CREATE POLICY "Workspace members can view phone numbers" 
ON public.phone_number FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.assistant a
        WHERE a.id = inbound_assistant_id
        AND (
            a.workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
            OR a.user_id = auth.uid()
            OR public.is_agency_admin_for_workspace(a.workspace_id, auth.uid())
        )
    )
);

-- INSERT: Members and Admins can insert (map) numbers for assistants in their workspace
CREATE POLICY "Workspace members can insert phone numbers" 
ON public.phone_number FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.assistant a
        WHERE a.id = inbound_assistant_id
        AND (
            (a.workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role != 'viewer'))
            OR a.user_id = auth.uid()
            OR public.is_agency_admin_for_workspace(a.workspace_id, auth.uid())
        )
    )
);

-- UPDATE: Admins can update all; Members can only update numbers for OWN assistants
CREATE POLICY "Workspace members can update phone numbers" 
ON public.phone_number FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.assistant a
        WHERE a.id = inbound_assistant_id
        AND (
            public.has_workspace_admin_rights(a.workspace_id, auth.uid())
            OR (a.user_id = auth.uid() AND public.get_workspace_user_role(a.workspace_id, auth.uid()) = 'member')
        )
    )
);

-- DELETE: Admins can delete all; Members can only delete numbers for OWN assistants
CREATE POLICY "Workspace members can delete phone numbers" 
ON public.phone_number FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.assistant a
        WHERE a.id = inbound_assistant_id
        AND (
            public.has_workspace_admin_rights(a.workspace_id, auth.uid())
            OR (a.user_id = auth.uid() AND public.get_workspace_user_role(a.workspace_id, auth.uid()) = 'member')
        )
    )
);
