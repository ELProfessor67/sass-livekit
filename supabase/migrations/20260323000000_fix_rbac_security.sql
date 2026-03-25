-- 1. Helper Function to get user role in workspace
CREATE OR REPLACE FUNCTION public.get_workspace_user_role(target_workspace_id UUID, target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Check if user is the direct owner in workspace_settings
    SELECT 'owner' INTO user_role
    FROM public.workspace_settings
    WHERE id = target_workspace_id AND user_id = target_user_id;

    IF user_role IS NOT NULL THEN
        RETURN user_role;
    END IF;

    -- Check if user is a member with a role
    SELECT role INTO user_role
    FROM public.workspace_members
    WHERE workspace_id = target_workspace_id AND user_id = target_user_id
    LIMIT 1;

    RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper Function to check if user has administrative rights (Owner or Manager/Admin)
CREATE OR REPLACE FUNCTION public.has_workspace_admin_rights(target_workspace_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    user_role := public.get_workspace_user_role(target_workspace_id, target_user_id);
    RETURN user_role IN ('owner', 'admin', 'manager') OR public.is_agency_admin_for_workspace(target_workspace_id, target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix Entity Table Policies (Assistants, Campaigns, etc.)
DO $$ 
DECLARE
    table_name_var TEXT;
    -- Separate tables by their specific RBAC requirements
    own_only_tables TEXT[] := ARRAY['campaigns', 'contacts', 'workflows', 'contact_lists', 'csv_files', 'csv_contacts'];
    cr_only_tables TEXT[] := ARRAY['assistant'];
    view_plus_tables TEXT[] := ARRAY['call_history', 'sms_messages'];
BEGIN
    -- Fix "Own Only" tables for Members (Composer, Contacts, Campaigns)
    FOREACH table_name_var IN ARRAY own_only_tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users can view %s in their workspaces" ON public.%I', table_name_var, table_name_var);
        
        -- SELECT: Everyone in workspace can view
        EXECUTE format('
            CREATE POLICY "Workspace members can view %s" 
            ON public.%I FOR SELECT 
            USING (
                workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
                OR user_id = auth.uid()
                OR public.is_agency_admin_for_workspace(workspace_id, auth.uid())
            )', table_name_var, table_name_var);

        -- INSERT: Members and Admins can insert
        EXECUTE format('
            CREATE POLICY "Workspace members can insert %s" 
            ON public.%I FOR INSERT 
            WITH CHECK (
                (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role != ''viewer''))
                OR user_id = auth.uid()
                OR public.is_agency_admin_for_workspace(workspace_id, auth.uid())
            )', table_name_var, table_name_var);

        -- UPDATE: Admins can update all; Members can only update OWN
        EXECUTE format('
            CREATE POLICY "Workspace members can update %s" 
            ON public.%I FOR UPDATE 
            USING (
                public.has_workspace_admin_rights(workspace_id, auth.uid())
                OR (user_id = auth.uid() AND public.get_workspace_user_role(workspace_id, auth.uid()) = ''member'')
            )', table_name_var, table_name_var);

        -- DELETE: Admins can delete all; Members can only delete OWN
        EXECUTE format('
            CREATE POLICY "Workspace members can delete %s" 
            ON public.%I FOR DELETE 
            USING (
                public.has_workspace_admin_rights(workspace_id, auth.uid())
                OR (user_id = auth.uid() AND public.get_workspace_user_role(workspace_id, auth.uid()) = ''member'')
            )', table_name_var, table_name_var);
    END LOOP;

    -- Fix "CR Only" tables for Members (Assistants)
    FOREACH table_name_var IN ARRAY cr_only_tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users can view %s in their workspaces" ON public.%I', table_name_var, table_name_var);
        
        -- SELECT: Everyone in workspace can view
        EXECUTE format('CREATE POLICY "Workspace members can view %s" ON public.%I FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR user_id = auth.uid())', table_name_var, table_name_var);

        -- INSERT: Members and Admins can insert
        EXECUTE format('CREATE POLICY "Workspace members can insert %s" ON public.%I FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role != ''viewer'') OR user_id = auth.uid())', table_name_var, table_name_var);

        -- UPDATE/DELETE: ONLY Admins (Members can only Create/Read)
        EXECUTE format('CREATE POLICY "Workspace admins can update %s" ON public.%I FOR UPDATE USING (public.has_workspace_admin_rights(workspace_id, auth.uid()))', table_name_var, table_name_var);
        EXECUTE format('CREATE POLICY "Workspace admins can delete %s" ON public.%I FOR DELETE USING (public.has_workspace_admin_rights(workspace_id, auth.uid()))', table_name_var, table_name_var);
    END LOOP;

    -- Fix "View Plus" tables (Call History - View+ for Members)
    FOREACH table_name_var IN ARRAY view_plus_tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users can view %s in their workspaces" ON public.%I', table_name_var, table_name_var);
        
        -- SELECT: Everyone in workspace can view
        EXECUTE format('CREATE POLICY "Workspace members can view %s" ON public.%I FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR user_id = auth.uid())', table_name_var, table_name_var);
        
        -- DELETE: Only Admins
        EXECUTE format('CREATE POLICY "Workspace admins can delete %s" ON public.%I FOR DELETE USING (public.has_workspace_admin_rights(workspace_id, auth.uid()))', table_name_var, table_name_var);
    END LOOP;
END $$;

-- 4. Fix Workspace Settings & Members Policies
-- ALREADY partially handled in recent migrations, but ensuring administrative lockdown
DROP POLICY IF EXISTS "Admins can update workspace settings" ON public.workspace_settings;
CREATE POLICY "Admins can update workspace settings" 
ON public.workspace_settings FOR UPDATE 
USING (public.has_workspace_admin_rights(id, auth.uid()));

DROP POLICY IF EXISTS "Admins can manage members" ON public.workspace_members;
CREATE POLICY "Admins can manage members" 
ON public.workspace_members FOR ALL 
USING (public.has_workspace_admin_rights(workspace_id, auth.uid()));
