-- Switch assistant to OpenAI TTS to avoid ElevenLabs websocket issues
-- This will prevent the "websocket closed unexpectedly" error

UPDATE public.assistant 
SET voice_provider_setting = 'OpenAI',
    voice_model_setting = 'tts-1',
    voice_name_setting = 'alloy'
WHERE id = '1a3c7fee-3437-48e1-a780-aad4f220a2f4';

-- Verify the change
SELECT 
    id, 
    name, 
    voice_provider_setting, 
    voice_model_setting, 
    voice_name_setting
FROM public.assistant 
WHERE id = '1a3c7fee-3437-48e1-a780-aad4f220a2f4';
