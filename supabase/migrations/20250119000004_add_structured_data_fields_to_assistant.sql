-- Add structured data fields to assistant table
-- This field will store the structured data configuration from the Analysis tab

ALTER TABLE public.assistant 
ADD COLUMN IF NOT EXISTS structured_data_fields JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.assistant.structured_data_fields IS 'Structured data fields configuration from Analysis tab (JSONB array)';

-- Create index for better query performance on structured data fields
CREATE INDEX IF NOT EXISTS idx_assistant_structured_data_fields ON public.assistant USING GIN(structured_data_fields) 
WHERE structured_data_fields IS NOT NULL AND jsonb_array_length(structured_data_fields) > 0;
