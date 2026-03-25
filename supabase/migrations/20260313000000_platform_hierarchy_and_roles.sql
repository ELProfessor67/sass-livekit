-- Migration to support 3-layer Platform Structure & Plan Toggles
-- Includes workspace hierarchy and granular roles
-- RESOLVES: "workspace_id does not exist" error by adding missing columns
-- Also ensures "tenant" exists for all tables to support whitelabel isolation

-- 1. Update plan_configs with plan_type and whitelabel support
ALTER TABLE public.plan_configs 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'simple' CHECK (plan_type IN ('simple', 'agency', 'whitelabel')),
ADD COLUMN IF NOT EXISTS whitelabel_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tenant TEXT;

COMMENT ON COLUMN public.plan_configs.plan_type IS 'Simple for standalone businesses, Agency for managing multiple clients, Whitelabel for platform resellers.';

-- 2. Update users with tenant and slug_name for whitelabeling
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS slug_name TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS tenant TEXT DEFAULT 'main';

COMMENT ON COLUMN public.users.slug_name IS 'Unique slug for whitelabel branding (e.g., custom-agency).';
COMMENT ON COLUMN public.users.tenant IS 'The tenant this user belongs to or manages.';

-- 3. Update workspace_settings with workspace_type
ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS workspace_type TEXT DEFAULT 'simple' CHECK (workspace_type IN ('simple', 'agency', 'client'));

COMMENT ON COLUMN public.workspace_settings.workspace_type IS 'Type of workspace: simple (standalone), agency (manager), client (managed).';

-- 4. Update workspace_members with restricted role set
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_role_check') THEN
        ALTER TABLE public.workspace_members 
        ADD CONSTRAINT workspace_members_role_check 
        CHECK (role IN ('owner', 'admin', 'member', 'manager', 'viewer'));
    END IF;
END $$;

-- 5. Helper Function for Agency Override
CREATE OR REPLACE FUNCTION public.is_agency_admin_for_workspace(target_workspace_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_settings ws
        JOIN public.workspace_members wm ON wm.workspace_id = ws.agency_id
        WHERE ws.id = target_workspace_id
        AND wm.user_id = is_agency_admin_for_workspace.user_id
        AND wm.role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add workspace_id, tenant, and user_id to all entity tables
DO $$ 
DECLARE
    table_name_var TEXT;
    entity_tables TEXT[] := ARRAY['assistant', 'campaigns', 'contact_lists', 'contacts', 'csv_files', 'csv_contacts', 'sms_messages', 'call_history', 'workflows'];
BEGIN
    FOREACH table_name_var IN ARRAY entity_tables
    LOOP
        -- Add user_id (if missing, like in call_history)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = table_name_var AND column_name = 'user_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE', table_name_var);
        END IF;

        -- Add workspace_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = table_name_var AND column_name = 'workspace_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE', table_name_var);
        END IF;

        -- Add tenant
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = table_name_var AND column_name = 'tenant') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant TEXT DEFAULT ''main''', table_name_var);
        END IF;

        -- Create or Update RLS Policies
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name_var);
        
        -- Drop existing user-level policies to avoid conflicts
        EXECUTE format('DROP POLICY IF EXISTS "Users can view their own %s" ON public.%I', table_name_var, table_name_var);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view %s in their workspaces" ON public.%I', table_name_var, table_name_var);
        
        -- Create new hierarchical policy
        EXECUTE format('
            CREATE POLICY "Users can view %s in their workspaces" 
            ON public.%I 
            FOR ALL 
            USING (
                workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
                OR public.is_agency_admin_for_workspace(workspace_id, auth.uid())
                OR user_id = auth.uid()
            )', table_name_var, table_name_var);
    END LOOP;
END $$;

-- 7. Backfill workspace_id, tenant, and user_id for existing records
DO $$ 
DECLARE
    table_name_var TEXT;
    entity_tables TEXT[] := ARRAY['assistant', 'campaigns', 'contact_lists', 'contacts', 'csv_files', 'csv_contacts', 'sms_messages', 'workflows'];
BEGIN
    FOREACH table_name_var IN ARRAY entity_tables
    LOOP
        -- Backfill workspace_id from user's oldest workspace
        EXECUTE format('
            UPDATE public.%I t
            SET workspace_id = (
                SELECT id FROM public.workspace_settings ws 
                WHERE ws.user_id = t.user_id 
                ORDER BY created_at ASC LIMIT 1
            )
            WHERE workspace_id IS NULL', table_name_var);

        -- Backfill tenant from user profile
        EXECUTE format('
            UPDATE public.%I t
            SET tenant = (
                SELECT tenant FROM public.users u 
                WHERE u.id = t.user_id 
                LIMIT 1
            )
            WHERE tenant = ''main'' OR tenant IS NULL', table_name_var);
    END LOOP;

    -- Special case for call_history (links via assistant_id)
    -- First, ensure ch.user_id is populated from assistant
    UPDATE public.call_history ch 
    SET user_id = (SELECT user_id FROM public.assistant a WHERE a.id::text = ch.assistant_id::text LIMIT 1)
    WHERE user_id IS NULL;

    -- Then backfill workspace and tenant
    UPDATE public.call_history ch 
    SET workspace_id = (SELECT workspace_id FROM public.assistant a WHERE a.id::text = ch.assistant_id::text LIMIT 1),
        tenant = (SELECT tenant FROM public.assistant a WHERE a.id::text = ch.assistant_id::text LIMIT 1)
    WHERE workspace_id IS NULL;
END $$;
