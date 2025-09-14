-- Add campaign_prompt field to campaigns table
-- This field will store the custom prompt/script for each campaign

ALTER TABLE public.campaigns 
ADD COLUMN campaign_prompt TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.campaign_prompt IS 'Custom prompt/script for the AI agent to follow during outbound calls. Supports placeholders like {name}, {email}, {phone}';

-- Create index for better query performance on campaign_prompt field
CREATE INDEX idx_campaigns_campaign_prompt ON public.campaigns(campaign_prompt) 
WHERE campaign_prompt IS NOT NULL;
