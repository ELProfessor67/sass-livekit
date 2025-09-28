-- Complete Groq Model Update Script
-- Updates all deprecated models to current production models based on official Groq documentation
-- Run this in Supabase SQL Editor

-- Step 1: Show current state
SELECT 
    'BEFORE UPDATE - Current Groq Models' as status,
    groq_model,
    llm_model_setting,
    COUNT(*) as count
FROM public.assistant 
WHERE llm_provider_setting = 'Groq'
GROUP BY groq_model, llm_model_setting
ORDER BY count DESC;

-- Step 2: Update all deprecated models to current production models
UPDATE public.assistant 
SET groq_model = 'llama-3.1-8b-instant',
    llm_model_setting = 'llama-3.1-8b-instant'
WHERE groq_model IN (
    'llama3-8b-8192',           -- Deprecated
    'llama3-70b-8192',          -- Deprecated  
    'mixtral-8x7b-32768',       -- Deprecated
    'gemma2-9b-it',             -- Deprecated
    'llama-3.1-70b-versatile'   -- Incorrect model name
);

-- Step 3: Update to correct 70B model name
UPDATE public.assistant 
SET groq_model = 'llama-3.3-70b-versatile',
    llm_model_setting = 'llama-3.3-70b-versatile'
WHERE groq_model = 'llama-3.1-70b-versatile';

-- Step 4: Show updated state
SELECT 
    'AFTER UPDATE - Updated Groq Models' as status,
    groq_model,
    llm_model_setting,
    COUNT(*) as count
FROM public.assistant 
WHERE llm_provider_setting = 'Groq'
GROUP BY groq_model, llm_model_setting
ORDER BY count DESC;

-- Step 5: Summary report
SELECT 
    'FINAL SUMMARY' as summary,
    COUNT(CASE WHEN llm_provider_setting = 'Groq' THEN 1 END) as total_groq_assistants,
    COUNT(CASE WHEN groq_model = 'llama-3.1-8b-instant' THEN 1 END) as using_8b_instant,
    COUNT(CASE WHEN groq_model = 'llama-3.3-70b-versatile' THEN 1 END) as using_70b_versatile,
    COUNT(CASE WHEN groq_model = 'openai/gpt-oss-120b' THEN 1 END) as using_gpt_oss_120b,
    COUNT(CASE WHEN groq_model = 'openai/gpt-oss-20b' THEN 1 END) as using_gpt_oss_20b,
    COUNT(CASE WHEN groq_model NOT IN ('llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b') THEN 1 END) as other_models
FROM public.assistant 
WHERE llm_provider_setting = 'Groq';
