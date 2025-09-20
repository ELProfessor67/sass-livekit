-- Add Pinecone assistant information to knowledge_bases table
-- This allows us to track which Pinecone assistant is associated with each knowledge base

-- Add Pinecone assistant columns to knowledge_bases table
ALTER TABLE public.knowledge_bases 
ADD COLUMN IF NOT EXISTS pinecone_assistant_id TEXT,
ADD COLUMN IF NOT EXISTS pinecone_assistant_name TEXT,
ADD COLUMN IF NOT EXISTS pinecone_assistant_instructions TEXT,
ADD COLUMN IF NOT EXISTS pinecone_assistant_region TEXT,
ADD COLUMN IF NOT EXISTS pinecone_assistant_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pinecone_assistant_updated_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN public.knowledge_bases.pinecone_assistant_id IS 'ID of the Pinecone assistant associated with this knowledge base';
COMMENT ON COLUMN public.knowledge_bases.pinecone_assistant_name IS 'Name of the Pinecone assistant';
COMMENT ON COLUMN public.knowledge_bases.pinecone_assistant_instructions IS 'Instructions for the Pinecone assistant';
COMMENT ON COLUMN public.knowledge_bases.pinecone_assistant_region IS 'Region where the Pinecone assistant is deployed';
COMMENT ON COLUMN public.knowledge_bases.pinecone_assistant_created_at IS 'When the Pinecone assistant was created';
COMMENT ON COLUMN public.knowledge_bases.pinecone_assistant_updated_at IS 'When the Pinecone assistant information was last updated';

-- Create index for better query performance on Pinecone assistant ID
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_pinecone_assistant_id 
ON public.knowledge_bases(pinecone_assistant_id);

-- Create index for better query performance on Pinecone assistant name
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_pinecone_assistant_name 
ON public.knowledge_bases(pinecone_assistant_name);
