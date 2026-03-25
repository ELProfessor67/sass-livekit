-- Fix RLS policies to allow members to see their memberships and invitations

-- 1. Update workspace_members policies
DROP POLICY IF EXISTS "Users can view members of their workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view their own membership and owners can view all" ON public.workspace_members;

CREATE POLICY "Members can view their own membership and owners can view all" 
ON public.workspace_members 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR 
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
);

-- 2. Update workspace_invitations policies
DROP POLICY IF EXISTS "Users can view invitations for their workspace" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Invited users can view their invitations and owners can view all" ON public.workspace_invitations;

CREATE POLICY "Invited users can view their invitations and owners can view all" 
ON public.workspace_invitations 
FOR SELECT 
USING (
  email = (auth.jwt() ->> 'email')
  OR 
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
);
