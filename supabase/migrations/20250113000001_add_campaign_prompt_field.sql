-- Add campaign_prompt field to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS campaign_prompt TEXT DEFAULT '';

-- Update existing campaigns with empty campaign prompt if null
UPDATE public.campaigns 
SET campaign_prompt = '' 
WHERE campaign_prompt IS NULL;