-- Add Pinecone file fields to knowledge_documents table
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS pinecone_file_id TEXT,
ADD COLUMN IF NOT EXISTS pinecone_status TEXT DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS pinecone_processed_at TIMESTAMPTZ;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_pinecone_file_id ON knowledge_documents(pinecone_file_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_pinecone_status ON knowledge_documents(pinecone_status);

-- Add comments for documentation
COMMENT ON COLUMN knowledge_documents.pinecone_file_id IS 'Pinecone file ID returned after upload to assistant';
COMMENT ON COLUMN knowledge_documents.pinecone_status IS 'Pinecone file processing status: uploaded, processing, ready, failed';
COMMENT ON COLUMN knowledge_documents.pinecone_processed_at IS 'Timestamp when file was processed by Pinecone assistant';

