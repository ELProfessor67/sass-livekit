-- Add content metadata fields to knowledge_documents table
ALTER TABLE public.knowledge_documents 
ADD COLUMN content_name TEXT,
ADD COLUMN content_description TEXT,
ADD COLUMN content_type TEXT DEFAULT 'document' CHECK (content_type IN ('document', 'website', 'text')),
ADD COLUMN content_url TEXT, -- For website content
ADD COLUMN content_text TEXT; -- For text content

-- Create index for content type
CREATE INDEX idx_knowledge_documents_content_type ON public.knowledge_documents(content_type);

-- Update RLS policies to include new fields
-- The existing policies already cover all columns, so no changes needed
