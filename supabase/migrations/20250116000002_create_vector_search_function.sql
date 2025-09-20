-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding VECTOR(3072),
  company_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  chunk_id UUID,
  doc_id UUID,
  chunk_text TEXT,
  chunk_index INT,
  page_start INT,
  page_end INT,
  section_name TEXT,
  heading TEXT,
  word_count INT,
  char_count INT,
  similarity FLOAT
)
LANGUAGE SQL
AS $$
  SELECT 
    c.chunk_id,
    c.doc_id,
    c.chunk_text,
    c.chunk_index,
    c.page_start,
    c.page_end,
    c.section_name,
    c.heading,
    c.word_count,
    c.char_count,
    1 - (e.embedding_vector <=> query_embedding) AS similarity
  FROM document_chunks c
  JOIN document_embeddings e ON c.chunk_id = e.chunk_id
  WHERE c.company_id = search_similar_chunks.company_id
    AND 1 - (e.embedding_vector <=> query_embedding) > match_threshold
  ORDER BY e.embedding_vector <=> query_embedding
  LIMIT match_count;
$$;

-- Create index for better vector search performance
CREATE INDEX ON document_embeddings USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- Create index for company_id filtering
CREATE INDEX ON document_embeddings(company_id);
CREATE INDEX ON document_chunks(company_id);
