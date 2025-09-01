-- Create workspace_settings table
CREATE TABLE public.workspace_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agency_id UUID,
  workspace_name TEXT NOT NULL DEFAULT 'My Workspace',
  logo_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  company_address TEXT,
  company_phone TEXT,
  company_website TEXT,
  company_industry TEXT,
  company_size TEXT,
  company_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own workspace settings" 
ON public.workspace_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workspace settings" 
ON public.workspace_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspace settings" 
ON public.workspace_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspace settings" 
ON public.workspace_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for workspace logos
INSERT INTO storage.buckets (id, name, public) VALUES ('workspace-logos', 'workspace-logos', true);

-- Create storage policies for workspace logos
CREATE POLICY "Workspace logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'workspace-logos');

CREATE POLICY "Users can upload workspace logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'workspace-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their workspace logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'workspace-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their workspace logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'workspace-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_workspace_settings_updated_at
BEFORE UPDATE ON public.workspace_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();