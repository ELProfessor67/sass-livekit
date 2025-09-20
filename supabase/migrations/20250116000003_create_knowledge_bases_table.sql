-- Create knowledge_bases table
CREATE TABLE public.knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add knowledge_base_id to knowledge_documents table
ALTER TABLE public.knowledge_documents 
ADD COLUMN knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for knowledge_bases
CREATE POLICY "Users can view their own knowledge bases" 
ON public.knowledge_bases 
FOR SELECT 
USING (auth.uid() = company_id);

CREATE POLICY "Users can insert their own knowledge bases" 
ON public.knowledge_bases 
FOR INSERT 
WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update their own knowledge bases" 
ON public.knowledge_bases 
FOR UPDATE 
USING (auth.uid() = company_id);

CREATE POLICY "Users can delete their own knowledge bases" 
ON public.knowledge_bases 
FOR DELETE 
USING (auth.uid() = company_id);

-- Create indexes for better performance
CREATE INDEX idx_knowledge_bases_company_id ON public.knowledge_bases(company_id);
CREATE INDEX idx_knowledge_documents_knowledge_base_id ON public.knowledge_documents(knowledge_base_id);

-- Create trigger for updated_at
CREATE TRIGGER update_knowledge_bases_updated_at 
    BEFORE UPDATE ON public.knowledge_bases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
