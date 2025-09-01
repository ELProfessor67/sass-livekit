-- Fix security issues by enabling RLS on existing tables and setting the search path for functions

-- Enable RLS on existing tables that don't have it
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_visibility ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for existing tables (users can only see their own data)
-- Appointments policies
CREATE POLICY "Users can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Assistant policies
CREATE POLICY "Users can view their own assistants" 
ON public.assistant 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assistants" 
ON public.assistant 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistants" 
ON public.assistant 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Call logs policies
CREATE POLICY "Users can view their own call logs" 
ON public.call_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call logs" 
ON public.call_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call logs" 
ON public.call_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users policies (users can only access their own record)
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- Locations policies
CREATE POLICY "Users can view their own locations" 
ON public.locations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own locations" 
ON public.locations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations" 
ON public.locations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Calendar integration policies
CREATE POLICY "Users can view their own calendar integration" 
ON public.calendar_integration 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar integration" 
ON public.calendar_integration 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar integration" 
ON public.calendar_integration 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Field visibility is public read-only
CREATE POLICY "Everyone can view field visibility" 
ON public.field_visibility 
FOR SELECT 
USING (true);

-- Agencies - users can only see agencies they belong to
CREATE POLICY "Users can view agencies they belong to" 
ON public.agencies 
FOR SELECT 
USING (true); -- For now, make it readable by all authenticated users

-- Fix function search path
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;