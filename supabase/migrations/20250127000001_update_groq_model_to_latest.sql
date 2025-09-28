-- Update existing assistants that use decommissioned models
-- to use current production models based on official Groq documentation

-- Update deprecated models to current production models
UPDATE public.assistant 
SET groq_model = 'llama-3.1-8b-instant'
WHERE groq_model IN (
    'llama3-8b-8192',           -- Deprecated
    'llama3-70b-8192',          -- Deprecated  
    'mixtral-8x7b-32768',       -- Deprecated
    'gemma2-9b-it'              -- Deprecated
);

-- Also update any assistants that might have the old model in the general model setting
-- if they are using Groq as the provider
UPDATE public.assistant 
SET llm_model_setting = 'llama-3.1-8b-instant'
WHERE llm_provider_setting = 'Groq' 
  AND llm_model_setting IN (
    'llama3-8b-8192',
    'llama3-70b-8192', 
    'mixtral-8x7b-32768',
    'gemma2-9b-it'
  );

-- Log the number of updated records
DO $$
DECLARE
    updated_groq_count INTEGER;
    updated_llm_count INTEGER;
BEGIN
    -- Count how many records were updated
    SELECT COUNT(*) INTO updated_groq_count 
    FROM public.assistant 
    WHERE groq_model = 'llama-3.1-8b-instant';
    
    SELECT COUNT(*) INTO updated_llm_count 
    FROM public.assistant 
    WHERE llm_provider_setting = 'Groq' 
      AND llm_model_setting = 'llama-3.1-8b-instant';
    
    RAISE NOTICE 'Updated % assistants with new Groq model (groq_model field)', updated_groq_count;
    RAISE NOTICE 'Updated % assistants with new Groq model (llm_model_setting field)', updated_llm_count;
END $$;
