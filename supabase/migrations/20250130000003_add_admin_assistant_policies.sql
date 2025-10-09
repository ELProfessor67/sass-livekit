-- Add admin policies for assistant table to allow admins to delete assistants
-- This migration ensures admins can manage all assistants for user deletion

-- First, add the missing DELETE policy for users to delete their own assistants
CREATE POLICY "Users can delete their own assistants" 
ON public.assistant 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add admin policies for assistant table
-- Allow admins to view all assistants
CREATE POLICY "Admins can view all assistants" 
ON public.assistant 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to update all assistants
CREATE POLICY "Admins can update all assistants" 
ON public.assistant 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all assistants
CREATE POLICY "Admins can delete all assistants" 
ON public.assistant 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Add admin policies for other tables that might be referenced
-- Allow admins to view all campaigns
CREATE POLICY "Admins can view all campaigns" 
ON public.campaigns 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all campaigns
CREATE POLICY "Admins can delete all campaigns" 
ON public.campaigns 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to view all contacts
CREATE POLICY "Admins can view all contacts" 
ON public.contacts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all contacts
CREATE POLICY "Admins can delete all contacts" 
ON public.contacts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to view all contact lists
CREATE POLICY "Admins can view all contact lists" 
ON public.contact_lists 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all contact lists
CREATE POLICY "Admins can delete all contact lists" 
ON public.contact_lists 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to view all CSV files
CREATE POLICY "Admins can view all csv files" 
ON public.csv_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all CSV files
CREATE POLICY "Admins can delete all csv files" 
ON public.csv_files 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to view all CSV contacts
CREATE POLICY "Admins can view all csv contacts" 
ON public.csv_contacts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all CSV contacts
CREATE POLICY "Admins can delete all csv contacts" 
ON public.csv_contacts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to view all SMS messages
CREATE POLICY "Admins can view all sms messages" 
ON public.sms_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all SMS messages
CREATE POLICY "Admins can delete all sms messages" 
ON public.sms_messages 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to view all knowledge bases
CREATE POLICY "Admins can view all knowledge bases" 
ON public.knowledge_bases 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all knowledge bases
CREATE POLICY "Admins can delete all knowledge bases" 
ON public.knowledge_bases 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to view all calendar credentials
CREATE POLICY "Admins can view all calendar credentials" 
ON public.user_calendar_credentials 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all calendar credentials
CREATE POLICY "Admins can delete all calendar credentials" 
ON public.user_calendar_credentials 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to view all WhatsApp credentials
CREATE POLICY "Admins can view all whatsapp credentials" 
ON public.user_whatsapp_credentials 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all WhatsApp credentials
CREATE POLICY "Admins can delete all whatsapp credentials" 
ON public.user_whatsapp_credentials 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to view all Twilio credentials
CREATE POLICY "Admins can view all twilio credentials" 
ON public.user_twilio_credentials 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all Twilio credentials
CREATE POLICY "Admins can delete all twilio credentials" 
ON public.user_twilio_credentials 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to view all workspace settings
CREATE POLICY "Admins can view all workspace settings" 
ON public.workspace_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- Allow admins to delete all workspace settings
CREATE POLICY "Admins can delete all workspace settings" 
ON public.workspace_settings 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);
