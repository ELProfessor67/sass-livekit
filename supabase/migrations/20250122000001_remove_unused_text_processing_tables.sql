-- Remove unused text processing tables since Pinecone handles everything internally
-- This migration removes tables that were created for local text extraction, chunking, and embedding
-- but are not being used since the system relies on Pinecone Assistant for all processing

-- Drop indexes first (they will be automatically dropped with tables, but being explicit)
DROP INDEX IF EXISTS idx_document_chunks_company_id;
DROP INDEX IF EXISTS idx_document_chunks_doc_id;
DROP INDEX IF EXISTS idx_document_embeddings_company_id;
DROP INDEX IF EXISTS idx_document_embeddings_doc_id;

-- Drop triggers first
DROP TRIGGER IF EXISTS update_chunking_config_updated_at ON public.chunking_config;
DROP TRIGGER IF EXISTS update_embedding_config_updated_at ON public.embedding_config;

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view their own document text" ON public.document_text;
DROP POLICY IF EXISTS "Service role can manage document text" ON public.document_text;

DROP POLICY IF EXISTS "Users can view their own document chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Service role can manage document chunks" ON public.document_chunks;

DROP POLICY IF EXISTS "Users can view their own document embeddings" ON public.document_embeddings;
DROP POLICY IF EXISTS "Service role can manage document embeddings" ON public.document_embeddings;

DROP POLICY IF EXISTS "Users can view their own chunking config" ON public.chunking_config;
DROP POLICY IF EXISTS "Users can manage their own chunking config" ON public.chunking_config;

DROP POLICY IF EXISTS "Users can view their own embedding config" ON public.embedding_config;
DROP POLICY IF EXISTS "Users can manage their own embedding config" ON public.embedding_config;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.document_embeddings CASCADE;
DROP TABLE IF EXISTS public.document_chunks CASCADE;
DROP TABLE IF EXISTS public.document_text CASCADE;
DROP TABLE IF EXISTS public.document_processing_metadata CASCADE;
DROP TABLE IF EXISTS public.chunking_config CASCADE;
DROP TABLE IF EXISTS public.embedding_config CASCADE;

-- Note: We keep knowledge_documents table as it's still used for document metadata
-- Note: We keep the vector extension as it might be used elsewhere

-- Update the status check constraint on knowledge_documents to remove unused statuses
ALTER TABLE public.knowledge_documents 
DROP CONSTRAINT IF EXISTS knowledge_documents_status_check;

ALTER TABLE public.knowledge_documents 
ADD CONSTRAINT knowledge_documents_status_check 
CHECK (status IN ('UPLOADED', 'PROCESSING', 'READY', 'ERROR'));

-- Add comment explaining the simplified status
COMMENT ON COLUMN public.knowledge_documents.status IS 'Document status: UPLOADED (file uploaded), PROCESSING (being processed by Pinecone), READY (processed and searchable), ERROR (processing failed)';

