-- Add Cerebras-specific fields to assistant table
-- These fields will store Cerebras API configuration for assistants

ALTER TABLE public.assistant 
ADD COLUMN cerebras_model TEXT DEFAULT 'cerebras-llama-2-7b',
ADD COLUMN cerebras_temperature DECIMAL(3,2) DEFAULT 0.1,
ADD COLUMN cerebras_max_tokens INTEGER DEFAULT 250;

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.cerebras_model IS 'Cerebras model to use (e.g., cerebras-llama-2-7b, cerebras-gpt-13b)';
COMMENT ON COLUMN public.assistant.cerebras_temperature IS 'Temperature setting for Cerebras model (0.0 to 1.0)';
COMMENT ON COLUMN public.assistant.cerebras_max_tokens IS 'Maximum tokens for Cerebras model response';

-- Create index for better query performance on Cerebras fields
CREATE INDEX idx_assistant_cerebras_fields ON public.assistant(cerebras_model) 
WHERE cerebras_model IS NOT NULL;
