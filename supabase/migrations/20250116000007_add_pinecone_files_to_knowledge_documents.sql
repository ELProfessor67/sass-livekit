-- Add Pinecone file management columns to knowledge_documents table
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS file_id TEXT,
ADD COLUMN IF NOT EXISTS pinecone_assistant_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_file_id ON knowledge_documents(file_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_pinecone_assistant ON knowledge_documents(pinecone_assistant_name);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status ON knowledge_documents(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_kb_file ON knowledge_documents(knowledge_base_id, file_id);

-- Add comments for documentation
COMMENT ON COLUMN knowledge_documents.file_id IS 'Pinecone file ID returned after upload';
COMMENT ON COLUMN knowledge_documents.pinecone_assistant_name IS 'Name of the Pinecone assistant this file was uploaded to';
COMMENT ON COLUMN knowledge_documents.file_type IS 'File extension/type (e.g., .pdf, .docx)';
COMMENT ON COLUMN knowledge_documents.status IS 'File processing status: uploaded, processing, ready, failed';
COMMENT ON COLUMN knowledge_documents.metadata IS 'Additional file metadata stored as JSON';
COMMENT ON COLUMN knowledge_documents.uploaded_at IS 'Timestamp when file was uploaded to Pinecone';
