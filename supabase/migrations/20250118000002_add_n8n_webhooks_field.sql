-- Add n8n_webhooks field to assistant table
-- This field will store webhook configurations as JSONB array

ALTER TABLE public.assistant 
ADD COLUMN n8n_webhooks JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.assistant.n8n_webhooks IS 'Array of webhook configurations with name, param, and description';

-- Create index for better query performance on n8n webhooks
CREATE INDEX idx_assistant_n8n_webhooks ON public.assistant USING GIN(n8n_webhooks) 
WHERE n8n_webhooks IS NOT NULL AND jsonb_array_length(n8n_webhooks) > 0;
