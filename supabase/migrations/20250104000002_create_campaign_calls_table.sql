-- Create campaign_calls table to track individual calls within campaigns
CREATE TABLE public.campaign_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  call_sid TEXT,
  room_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'calling', 'answered', 'completed', 'failed', 'no_answer', 'busy', 'do_not_call')),
  outcome TEXT CHECK (outcome IN ('interested', 'not_interested', 'callback', 'do_not_call', 'voicemail', 'wrong_number')),
  call_duration INTEGER DEFAULT 0,
  recording_url TEXT,
  transcription JSONB,
  summary TEXT,
  notes TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call_queue table for managing pending calls
CREATE TABLE public.call_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_call_id UUID NOT NULL REFERENCES public.campaign_calls(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add execution status to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN execution_status TEXT DEFAULT 'idle' CHECK (execution_status IN ('idle', 'running', 'paused', 'completed', 'error')),
ADD COLUMN last_execution_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN next_call_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN current_daily_calls INTEGER DEFAULT 0,
ADD COLUMN total_calls_made INTEGER DEFAULT 0,
ADD COLUMN total_calls_answered INTEGER DEFAULT 0;

-- Enable Row Level Security
ALTER TABLE public.campaign_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaign_calls
CREATE POLICY "Users can view their own campaign calls" 
ON public.campaign_calls 
FOR SELECT 
USING (campaign_id IN (
  SELECT id FROM public.campaigns WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own campaign calls" 
ON public.campaign_calls 
FOR INSERT 
WITH CHECK (campaign_id IN (
  SELECT id FROM public.campaigns WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their own campaign calls" 
ON public.campaign_calls 
FOR UPDATE 
USING (campaign_id IN (
  SELECT id FROM public.campaigns WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete their own campaign calls" 
ON public.campaign_calls 
FOR DELETE 
USING (campaign_id IN (
  SELECT id FROM public.campaigns WHERE user_id = auth.uid()
));

-- Create RLS policies for call_queue
CREATE POLICY "Users can view their own call queue" 
ON public.call_queue 
FOR SELECT 
USING (campaign_id IN (
  SELECT id FROM public.campaigns WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own call queue" 
ON public.call_queue 
FOR INSERT 
WITH CHECK (campaign_id IN (
  SELECT id FROM public.campaigns WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their own call queue" 
ON public.call_queue 
FOR UPDATE 
USING (campaign_id IN (
  SELECT id FROM public.campaigns WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete their own call queue" 
ON public.call_queue 
FOR DELETE 
USING (campaign_id IN (
  SELECT id FROM public.campaigns WHERE user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_campaign_calls_campaign_id ON public.campaign_calls(campaign_id);
CREATE INDEX idx_campaign_calls_status ON public.campaign_calls(status);
CREATE INDEX idx_campaign_calls_phone_number ON public.campaign_calls(phone_number);
CREATE INDEX idx_campaign_calls_scheduled_at ON public.campaign_calls(scheduled_at);
CREATE INDEX idx_campaign_calls_call_sid ON public.campaign_calls(call_sid);

CREATE INDEX idx_call_queue_campaign_id ON public.call_queue(campaign_id);
CREATE INDEX idx_call_queue_status ON public.call_queue(status);
CREATE INDEX idx_call_queue_scheduled_for ON public.call_queue(scheduled_for);
CREATE INDEX idx_call_queue_priority ON public.call_queue(priority);

CREATE INDEX idx_campaigns_execution_status ON public.campaigns(execution_status);
CREATE INDEX idx_campaigns_next_call_at ON public.campaigns(next_call_at);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_campaign_calls_updated_at
BEFORE UPDATE ON public.campaign_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_queue_updated_at
BEFORE UPDATE ON public.call_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
