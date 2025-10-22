-- Remove Deprecated Groq Models Script
-- This script removes all deprecated Groq model references and updates them to current models
-- Run this in Supabase SQL Editor

-- Step 1: Show current state of deprecated models
SELECT 
    'BEFORE UPDATE - Deprecated Groq Models' as status,
    groq_model,
    llm_model_setting,
    COUNT(*) as count
FROM public.assistant 
WHERE llm_provider_setting = 'Groq' 
  AND groq_model IN (
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'llama3-8b-8192',
    'llama3-70b-8192',
    'llama-3.1-70b-versatile',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b'
  )
GROUP BY groq_model, llm_model_setting
ORDER BY count DESC;

-- Step 2: Update all deprecated models to current production models
UPDATE public.assistant 
SET groq_model = 'llama-3.1-8b-instant',
    llm_model_setting = 'llama-3.1-8b-instant'
WHERE llm_provider_setting = 'Groq' 
  AND groq_model IN (
    'mixtral-8x7b-32768',       -- Deprecated Mixtral
    'gemma2-9b-it',             -- Deprecated Gemma
    'llama3-8b-8192',           -- Deprecated Llama 3
    'llama3-70b-8192',          -- Deprecated Llama 3 70B
    'openai/gpt-oss-20b'        -- Deprecated GPT-OSS 20B
  );

-- Step 3: Update 70B models to correct current model name
UPDATE public.assistant 
SET groq_model = 'llama-3.3-70b-versatile',
    llm_model_setting = 'llama-3.3-70b-versatile'
WHERE llm_provider_setting = 'Groq' 
  AND groq_model IN (
    'llama-3.1-70b-versatile',  -- Incorrect model name
    'openai/gpt-oss-120b'        -- Deprecated GPT-OSS 120B
  );

-- Step 4: Show updated state
SELECT 
    'AFTER UPDATE - Current Groq Models' as status,
    groq_model,
    llm_model_setting,
    COUNT(*) as count
FROM public.assistant 
WHERE llm_provider_setting = 'Groq'
GROUP BY groq_model, llm_model_setting
ORDER BY count DESC;

-- Step 4.5: Add Maverick model option (if needed for new assistants)
-- This is informational - Maverick is now available in the frontend
SELECT 
    'AVAILABLE GROQ MODELS' as info,
    'llama-3.1-8b-instant' as model_1,
    'llama-3.3-70b-versatile' as model_2,
    'meta-llama/llama-4-maverick-17b-128e-instruct' as model_3;

-- Step 5: Final verification - ensure no deprecated models remain
SELECT 
    'VERIFICATION - Remaining Deprecated Models' as status,
    groq_model,
    llm_model_setting,
    COUNT(*) as count
FROM public.assistant 
WHERE llm_provider_setting = 'Groq' 
  AND groq_model IN (
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'llama3-8b-8192',
    'llama3-70b-8192',
    'llama-3.1-70b-versatile',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b'
  )
GROUP BY groq_model, llm_model_setting;

-- Step 6: Summary report
SELECT 
    'FINAL SUMMARY' as summary,
    COUNT(*) as total_groq_assistants,
    COUNT(CASE WHEN groq_model = 'llama-3.1-8b-instant' THEN 1 END) as llama_8b_count,
    COUNT(CASE WHEN groq_model = 'llama-3.3-70b-versatile' THEN 1 END) as llama_70b_count
FROM public.assistant 
WHERE llm_provider_setting = 'Groq';
