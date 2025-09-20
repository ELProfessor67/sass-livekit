-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES public.assistant(id) ON DELETE SET NULL,
  contact_list_id UUID REFERENCES public.contact_lists(id) ON DELETE SET NULL,
  csv_file_id UUID REFERENCES public.csv_files(id) ON DELETE SET NULL,
  contact_source TEXT NOT NULL CHECK (contact_source IN ('contact_list', 'csv_file')),
  daily_cap INTEGER NOT NULL DEFAULT 100,
  calling_days TEXT[] NOT NULL DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  start_hour INTEGER NOT NULL DEFAULT 9,
  end_hour INTEGER NOT NULL DEFAULT 17,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  dials INTEGER NOT NULL DEFAULT 0,
  pickups INTEGER NOT NULL DEFAULT 0,
  do_not_call INTEGER NOT NULL DEFAULT 0,
  interested INTEGER NOT NULL DEFAULT 0,
  not_interested INTEGER NOT NULL DEFAULT 0,
  callback INTEGER NOT NULL DEFAULT 0,
  total_usage INTEGER NOT NULL DEFAULT 0,
  campaign_prompt TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" 
ON public.campaigns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" 
ON public.campaigns 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_assistant_id ON public.campaigns(assistant_id);
CREATE INDEX idx_campaigns_contact_list_id ON public.campaigns(contact_list_id);
CREATE INDEX idx_campaigns_csv_file_id ON public.campaigns(csv_file_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
