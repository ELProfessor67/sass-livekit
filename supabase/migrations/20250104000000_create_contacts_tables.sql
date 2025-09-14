-- Create contact_lists table
CREATE TABLE public.contact_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'do-not-call')),
  do_not_call BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure at least one contact method is provided
  CONSTRAINT contacts_contact_method_check CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Create csv_files table to store uploaded CSV metadata
CREATE TABLE public.csv_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  row_count INTEGER NOT NULL DEFAULT 0,
  file_size INTEGER, -- in bytes
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create csv_contacts table to store individual contacts from CSV files
CREATE TABLE public.csv_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  csv_file_id UUID NOT NULL REFERENCES public.csv_files(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'do-not-call')),
  do_not_call BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure at least one contact method is provided
  CONSTRAINT csv_contacts_contact_method_check CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Enable Row Level Security
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_lists
CREATE POLICY "Users can view their own contact lists" 
ON public.contact_lists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact lists" 
ON public.contact_lists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact lists" 
ON public.contact_lists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact lists" 
ON public.contact_lists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for contacts
CREATE POLICY "Users can view their own contacts" 
ON public.contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
ON public.contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
ON public.contacts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for csv_files
CREATE POLICY "Users can view their own CSV files" 
ON public.csv_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CSV files" 
ON public.csv_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CSV files" 
ON public.csv_files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CSV files" 
ON public.csv_files 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for csv_contacts
CREATE POLICY "Users can view their own CSV contacts" 
ON public.csv_contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CSV contacts" 
ON public.csv_contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CSV contacts" 
ON public.csv_contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CSV contacts" 
ON public.csv_contacts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_list_id ON public.contacts(list_id);
CREATE INDEX idx_contact_lists_user_id ON public.contact_lists(user_id);
CREATE INDEX idx_csv_files_user_id ON public.csv_files(user_id);
CREATE INDEX idx_csv_contacts_user_id ON public.csv_contacts(user_id);
CREATE INDEX idx_csv_contacts_csv_file_id ON public.csv_contacts(csv_file_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_contact_lists_updated_at
BEFORE UPDATE ON public.contact_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_csv_files_updated_at
BEFORE UPDATE ON public.csv_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
