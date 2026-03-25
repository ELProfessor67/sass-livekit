-- 1. Create a security definer function to check workspace membership
-- This bypasses RLS for the check itself, breaking the recursion
CREATE OR REPLACE FUNCTION public.check_is_workspace_member(target_workspace_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = target_workspace_id 
    AND user_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update workspace_settings policy
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspace_settings;
DROP POLICY IF EXISTS "Users can view their own workspace settings" ON public.workspace_settings;

CREATE POLICY "Users can view workspaces they are members of" 
ON public.workspace_settings 
FOR SELECT 
USING (
    user_id = auth.uid()
    OR 
    public.check_is_workspace_member(id, auth.uid())
    OR 
    public.is_agency_admin_for_workspace(id, auth.uid())
);

-- 3. Update workspace_members policy
DROP POLICY IF EXISTS "Members can view all members of their workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view their own membership and owners can view all" ON public.workspace_members;

CREATE POLICY "Members can view all members of their workspace" 
ON public.workspace_members 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
  OR
  public.check_is_workspace_member(workspace_id, auth.uid())
);


