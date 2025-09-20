-- Remove manual text extraction, chunking, and vector processing tables
-- Since we're now using Pinecone Assistants for all processing

-- Drop tables that are no longer needed
DROP TABLE IF EXISTS public.document_processing_metadata CASCADE;
DROP TABLE IF EXISTS public.document_text CASCADE;
DROP TABLE IF EXISTS public.document_chunks CASCADE;
DROP TABLE IF EXISTS public.document_embeddings CASCADE;
DROP TABLE IF EXISTS public.chunking_config CASCADE;

-- Remove unused columns from knowledge_documents table
ALTER TABLE public.knowledge_documents 
DROP COLUMN IF EXISTS file_id,
DROP COLUMN IF EXISTS pinecone_assistant_name,
DROP COLUMN IF EXISTS file_type,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS metadata,
DROP COLUMN IF EXISTS uploaded_at;

-- Remove unused columns from knowledge_bases table
ALTER TABLE public.knowledge_bases 
DROP COLUMN IF EXISTS pinecone_index_name,
DROP COLUMN IF EXISTS pinecone_index_host,
DROP COLUMN IF EXISTS pinecone_index_status,
DROP COLUMN IF EXISTS pinecone_index_dimension,
DROP COLUMN IF EXISTS pinecone_index_metric,
DROP COLUMN IF EXISTS pinecone_created_at,
DROP COLUMN IF EXISTS pinecone_updated_at;

-- Add comment explaining the cleanup
COMMENT ON TABLE public.knowledge_documents IS 'Knowledge base documents with Pinecone Assistant file management';
COMMENT ON TABLE public.knowledge_bases IS 'Knowledge bases with Pinecone Assistant integration';

