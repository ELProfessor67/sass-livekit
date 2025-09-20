-- Remove vector search functionality and vector tables from knowledge base
-- This migration removes all vector/embedding related tables and functions

-- Drop the vector search function
DROP FUNCTION IF EXISTS search_similar_chunks(VECTOR(3072), UUID, FLOAT, INT);

-- Drop vector indexes
DROP INDEX IF EXISTS document_embeddings_embedding_vector_idx;
DROP INDEX IF EXISTS document_embeddings_company_id_idx;
DROP INDEX IF EXISTS document_chunks_company_id_idx;

-- Drop embedding configuration table
DROP TABLE IF EXISTS public.embedding_config CASCADE;

-- Drop document embeddings table
DROP TABLE IF EXISTS public.document_embeddings CASCADE;

-- Remove pgvector extension (only if no other tables use it)
-- DROP EXTENSION IF EXISTS vector;

-- Update document status check constraint to remove 'EMBEDDED' status
ALTER TABLE public.knowledge_documents 
DROP CONSTRAINT IF EXISTS knowledge_documents_status_check;

ALTER TABLE public.knowledge_documents 
ADD CONSTRAINT knowledge_documents_status_check 
CHECK (status IN ('UPLOADED', 'PARSED', 'CHUNKED', 'ERROR'));

-- Update any existing 'EMBEDDED' status to 'CHUNKED'
UPDATE public.knowledge_documents 
SET status = 'CHUNKED' 
WHERE status = 'EMBEDDED';

-- Add comment explaining the change
COMMENT ON TABLE public.knowledge_documents IS 'Knowledge base documents without vector storage';
COMMENT ON TABLE public.document_chunks IS 'Document text chunks for basic text processing only';
