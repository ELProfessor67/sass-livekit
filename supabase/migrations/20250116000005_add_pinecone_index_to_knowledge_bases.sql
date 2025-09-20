-- Add Pinecone index information to knowledge_bases table
-- This allows us to track which Pinecone index is associated with each knowledge base

-- Add Pinecone index columns to knowledge_bases table
ALTER TABLE public.knowledge_bases 
ADD COLUMN IF NOT EXISTS pinecone_index_name TEXT,
ADD COLUMN IF NOT EXISTS pinecone_index_host TEXT,
ADD COLUMN IF NOT EXISTS pinecone_index_status TEXT,
ADD COLUMN IF NOT EXISTS pinecone_index_dimension INTEGER,
ADD COLUMN IF NOT EXISTS pinecone_index_metric TEXT,
ADD COLUMN IF NOT EXISTS pinecone_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pinecone_updated_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN public.knowledge_bases.pinecone_index_name IS 'Name of the Pinecone index associated with this knowledge base';
COMMENT ON COLUMN public.knowledge_bases.pinecone_index_host IS 'Host URL of the Pinecone index';
COMMENT ON COLUMN public.knowledge_bases.pinecone_index_status IS 'Current status of the Pinecone index (Ready, ScalingUp, etc.)';
COMMENT ON COLUMN public.knowledge_bases.pinecone_index_dimension IS 'Dimension of vectors stored in the Pinecone index';
COMMENT ON COLUMN public.knowledge_bases.pinecone_index_metric IS 'Similarity metric used by the Pinecone index (cosine, euclidean, dotproduct)';
COMMENT ON COLUMN public.knowledge_bases.pinecone_created_at IS 'When the Pinecone index was created';
COMMENT ON COLUMN public.knowledge_bases.pinecone_updated_at IS 'When the Pinecone index information was last updated';

-- Create index for better query performance on Pinecone index name
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_pinecone_index_name 
ON public.knowledge_bases(pinecone_index_name);

-- Create index for better query performance on Pinecone index status
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_pinecone_index_status 
ON public.knowledge_bases(pinecone_index_status);
