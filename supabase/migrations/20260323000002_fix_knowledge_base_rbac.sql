-- Fix RBAC for Knowledge Base tables to be workspace-aware
-- Currently restricted to company_id = auth.uid(), which excludes workspace members/viewers

-- 1. DROP old restricted policies
DROP POLICY IF EXISTS "Users can view their own knowledge bases" ON public.knowledge_bases;
DROP POLICY IF EXISTS "Users can view their own knowledge documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Users can view their own document chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can view their own document embeddings" ON public.document_embeddings;
DROP POLICY IF EXISTS "Users can view their own chunking config" ON public.chunking_config;
DROP POLICY IF EXISTS "Users can view their own embedding config" ON public.embedding_config;

-- 2. CREATE new workspace-aware policies
-- A user can view a knowledge base if they are the owner OR a member of a workspace owned by the company_id

-- Helper for viewing (SELECT)
CREATE OR REPLACE FUNCTION public.can_view_kb_content(target_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        target_company_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.workspace_settings ws
            WHERE ws.user_id = target_company_id
            AND (
                ws.id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
                OR public.is_agency_admin_for_workspace(ws.id, auth.uid())
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper for managing (INSERT/UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.can_manage_kb_content(target_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        target_company_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.workspace_settings ws
            WHERE ws.user_id = target_company_id
            AND (
                ws.id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role != 'viewer')
                OR public.is_agency_admin_for_workspace(ws.id, auth.uid())
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply policies to Knowledge Bases
CREATE POLICY "Workspace members can view knowledge bases" 
ON public.knowledge_bases FOR SELECT 
USING (public.can_view_kb_content(company_id));

CREATE POLICY "Workspace members can manage knowledge bases" 
ON public.knowledge_bases FOR ALL 
USING (public.can_manage_kb_content(company_id));

-- Apply policies to Knowledge Documents
CREATE POLICY "Workspace members can view knowledge documents" 
ON public.knowledge_documents FOR SELECT 
USING (public.can_view_kb_content(company_id));

CREATE POLICY "Workspace members can manage knowledge documents" 
ON public.knowledge_documents FOR ALL 
USING (public.can_manage_kb_content(company_id));

-- Apply policies to secondary tables (chunks, embeddings, configs)
CREATE POLICY "Workspace members can view document chunks" 
ON public.document_chunks FOR SELECT 
USING (public.can_view_kb_content(company_id));

CREATE POLICY "Workspace members can view document embeddings" 
ON public.document_embeddings FOR SELECT 
USING (public.can_view_kb_content(company_id));

CREATE POLICY "Workspace members can view chunking config" 
ON public.chunking_config FOR SELECT 
USING (public.can_view_kb_content(company_id));

CREATE POLICY "Workspace members can view embedding config" 
ON public.embedding_config FOR SELECT 
USING (public.can_view_kb_content(company_id));
