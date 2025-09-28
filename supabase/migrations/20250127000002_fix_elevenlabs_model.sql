-- Fix ElevenLabs TTS model name from invalid eleven_turbo_v2_5 to eleven_turbo_v2
-- This fixes the TTS disconnection issue

-- Update voice model setting for assistants using ElevenLabs
UPDATE public.assistant 
SET voice_model_setting = 'eleven_turbo_v2'
WHERE voice_provider_setting = 'ElevenLabs' 
  AND voice_model_setting = 'eleven_turbo_v2_5';

-- Show summary of changes
SELECT 
    'ElevenLabs Model Fix Summary' as summary,
    COUNT(*) as total_elevenlabs_assistants,
    COUNT(CASE WHEN voice_model_setting = 'eleven_turbo_v2' THEN 1 END) as using_turbo_v2,
    COUNT(CASE WHEN voice_model_setting = 'eleven_multilingual_v2' THEN 1 END) as using_multilingual_v2,
    COUNT(CASE WHEN voice_model_setting = 'eleven_monolingual_v1' THEN 1 END) as using_monolingual_v1
FROM public.assistant 
WHERE voice_provider_setting = 'ElevenLabs';
