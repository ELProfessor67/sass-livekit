-- Add Groq-specific fields to assistant table
-- These fields will store Groq API configuration for assistants

ALTER TABLE public.assistant 
ADD COLUMN groq_api_key TEXT,
ADD COLUMN groq_model TEXT DEFAULT 'llama-3.1-8b-instant',
ADD COLUMN groq_temperature DECIMAL(3,2) DEFAULT 0.1,
ADD COLUMN groq_max_tokens INTEGER DEFAULT 250;

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.groq_api_key IS 'Groq API key for LLM processing (optional - can use global GROQ_API_KEY)';
COMMENT ON COLUMN public.assistant.groq_model IS 'Groq model to use (e.g., llama-3.1-8b-instant, llama3-70b-8192)';
COMMENT ON COLUMN public.assistant.groq_temperature IS 'Temperature setting for Groq model (0.0 to 1.0)';
COMMENT ON COLUMN public.assistant.groq_max_tokens IS 'Maximum tokens for Groq model response';

-- Create index for better query performance on Groq fields
CREATE INDEX idx_assistant_groq_fields ON public.assistant(groq_api_key, groq_model) 
WHERE groq_api_key IS NOT NULL OR groq_model IS NOT NULL;
