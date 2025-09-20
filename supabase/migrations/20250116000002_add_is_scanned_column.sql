-- Add is_scanned column to document_text table
-- This migration adds the missing is_scanned column that the text extraction services expect

ALTER TABLE public.document_text 
ADD COLUMN IF NOT EXISTS is_scanned BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.document_text.is_scanned IS 'Whether the document is a scanned image that required OCR processing';
