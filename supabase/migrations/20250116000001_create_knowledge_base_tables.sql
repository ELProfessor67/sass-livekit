-- Create knowledge base tables
-- Main documents table
CREATE TABLE public.knowledge_documents (
  doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'PARSED', 'CHUNKED', 'EMBEDDED', 'ERROR')),
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document processing metadata
CREATE TABLE public.document_processing_metadata (
  doc_id UUID PRIMARY KEY REFERENCES public.knowledge_documents(doc_id) ON DELETE CASCADE,
  total_pages INTEGER,
  is_scanned BOOLEAN,
  ocr_confidence FLOAT,
  processing_errors TEXT[],
  raw_text_length INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extracted text storage
CREATE TABLE public.document_text (
  doc_id UUID PRIMARY KEY REFERENCES public.knowledge_documents(doc_id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  cleaned_text TEXT NOT NULL,
  page_breaks INTEGER[], -- Array of character positions where pages break
  extraction_method TEXT NOT NULL, -- 'direct_pdf', 'ocr_textract', 'ocr_tesseract', 'mammoth', etc.
  confidence_score FLOAT,
  processing_time_ms INTEGER,
  is_scanned BOOLEAN DEFAULT FALSE, -- Whether the document is a scanned image
  metadata JSONB,
  checksum TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Text chunks
CREATE TABLE public.document_chunks (
  chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES public.knowledge_documents(doc_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Order within document
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  section_name TEXT, -- If we can detect sections
  heading TEXT, -- Main heading for this chunk
  word_count INTEGER NOT NULL,
  char_count INTEGER NOT NULL,
  token_count INTEGER,
  overlap_with_previous INTEGER DEFAULT 0, -- Characters overlapping with previous chunk
  overlap_with_next INTEGER DEFAULT 0,    -- Characters overlapping with next chunk
  chunk_slug TEXT, -- URL-friendly identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector embeddings (using pgvector extension)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.document_embeddings (
  chunk_id UUID PRIMARY KEY REFERENCES public.document_chunks(chunk_id) ON DELETE CASCADE,
  doc_id UUID NOT NULL REFERENCES public.knowledge_documents(doc_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  embedding_model TEXT NOT NULL, -- 'text-embedding-3-small', 'text-embedding-3-large', etc.
  embedding_dimension INTEGER NOT NULL, -- 1536 for text-embedding-3-small, 3072 for text-embedding-3-large
  embedding_vector VECTOR(3072), -- Using max dimension for flexibility
  embedding_metadata JSONB, -- Model version, temperature, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chunking configuration per company
CREATE TABLE public.chunking_config (
  company_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  chunk_size INTEGER DEFAULT 400, -- Target words per chunk
  overlap_percentage INTEGER DEFAULT 15, -- 15% overlap
  min_chunk_size INTEGER DEFAULT 100, -- Minimum words to keep a chunk
  max_chunk_size INTEGER DEFAULT 800, -- Maximum words before splitting
  use_token_based BOOLEAN DEFAULT false, -- Use token-based chunking instead of word-based
  model_name TEXT DEFAULT 'gpt-3.5-turbo', -- Model for token counting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Embedding configuration per company
CREATE TABLE public.embedding_config (
  company_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  model TEXT DEFAULT 'text-embedding-3-small', -- OpenAI embedding model
  batch_size INTEGER DEFAULT 100, -- Batch size for processing
  normalize BOOLEAN DEFAULT true, -- Whether to normalize text before embedding
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_text ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunking_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for knowledge_documents
CREATE POLICY "Users can view their own knowledge documents" 
ON public.knowledge_documents 
FOR SELECT 
USING (auth.uid() = company_id);

CREATE POLICY "Users can insert their own knowledge documents" 
ON public.knowledge_documents 
FOR INSERT 
WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update their own knowledge documents" 
ON public.knowledge_documents 
FOR UPDATE 
USING (auth.uid() = company_id);

CREATE POLICY "Users can delete their own knowledge documents" 
ON public.knowledge_documents 
FOR DELETE 
USING (auth.uid() = company_id);

-- Create RLS policies for document_processing_metadata
CREATE POLICY "Users can view their own document metadata" 
ON public.document_processing_metadata 
FOR SELECT 
USING (auth.uid() IN (SELECT company_id FROM public.knowledge_documents WHERE doc_id = document_processing_metadata.doc_id));

CREATE POLICY "Service role can manage document metadata" 
ON public.document_processing_metadata 
FOR ALL 
USING (true);

-- Create RLS policies for document_text
CREATE POLICY "Users can view their own document text" 
ON public.document_text 
FOR SELECT 
USING (auth.uid() IN (SELECT company_id FROM public.knowledge_documents WHERE doc_id = document_text.doc_id));

CREATE POLICY "Service role can manage document text" 
ON public.document_text 
FOR ALL 
USING (true);

-- Create RLS policies for document_chunks
CREATE POLICY "Users can view their own document chunks" 
ON public.document_chunks 
FOR SELECT 
USING (auth.uid() = company_id);

CREATE POLICY "Service role can manage document chunks" 
ON public.document_chunks 
FOR ALL 
USING (true);

-- Create RLS policies for document_embeddings
CREATE POLICY "Users can view their own document embeddings" 
ON public.document_embeddings 
FOR SELECT 
USING (auth.uid() = company_id);

CREATE POLICY "Service role can manage document embeddings" 
ON public.document_embeddings 
FOR ALL 
USING (true);

-- Create RLS policies for chunking_config
CREATE POLICY "Users can view their own chunking config" 
ON public.chunking_config 
FOR SELECT 
USING (auth.uid() = company_id);

CREATE POLICY "Users can manage their own chunking config" 
ON public.chunking_config 
FOR ALL 
USING (auth.uid() = company_id);

-- Create RLS policies for embedding_config
CREATE POLICY "Users can view their own embedding config" 
ON public.embedding_config 
FOR SELECT 
USING (auth.uid() = company_id);

CREATE POLICY "Users can manage their own embedding config" 
ON public.embedding_config 
FOR ALL 
USING (auth.uid() = company_id);

-- Create indexes for better performance
CREATE INDEX idx_knowledge_documents_company_id ON public.knowledge_documents(company_id);
CREATE INDEX idx_knowledge_documents_status ON public.knowledge_documents(status);
CREATE INDEX idx_document_chunks_company_id ON public.document_chunks(company_id);
CREATE INDEX idx_document_chunks_doc_id ON public.document_chunks(doc_id);
CREATE INDEX idx_document_embeddings_company_id ON public.document_embeddings(company_id);
CREATE INDEX idx_document_embeddings_doc_id ON public.document_embeddings(doc_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_knowledge_documents_updated_at 
    BEFORE UPDATE ON public.knowledge_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chunking_config_updated_at 
    BEFORE UPDATE ON public.chunking_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_embedding_config_updated_at 
    BEFORE UPDATE ON public.embedding_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
