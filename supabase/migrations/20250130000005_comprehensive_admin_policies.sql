-- Comprehensive admin policies for all user-managed tables
-- This allows support/admin users to manage all resources on behalf of other users

-- ==============================================
-- ASSISTANT TABLE (already exists, but adding for completeness)
-- ==============================================
CREATE POLICY "Admins can insert assistants for any user" 
ON public.assistant 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- ==============================================
-- CONTACT LISTS TABLE
-- ==============================================
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

CREATE POLICY "Admins can insert contact lists for any user" 
ON public.contact_lists 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all contact lists" 
ON public.contact_lists 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

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

-- ==============================================
-- CONTACTS TABLE
-- ==============================================
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

CREATE POLICY "Admins can insert contacts for any user" 
ON public.contacts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all contacts" 
ON public.contacts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

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

-- ==============================================
-- CSV FILES TABLE
-- ==============================================
CREATE POLICY "Admins can view all CSV files" 
ON public.csv_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can insert CSV files for any user" 
ON public.csv_files 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all CSV files" 
ON public.csv_files 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can delete all CSV files" 
ON public.csv_files 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- ==============================================
-- CSV CONTACTS TABLE
-- ==============================================
CREATE POLICY "Admins can view all CSV contacts" 
ON public.csv_contacts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can insert CSV contacts for any user" 
ON public.csv_contacts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all CSV contacts" 
ON public.csv_contacts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can delete all CSV contacts" 
ON public.csv_contacts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- ==============================================
-- CAMPAIGNS TABLE
-- ==============================================
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

CREATE POLICY "Admins can insert campaigns for any user" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

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

-- ==============================================
-- KNOWLEDGE BASES TABLE
-- ==============================================
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

CREATE POLICY "Admins can insert knowledge bases for any user" 
ON public.knowledge_bases 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all knowledge bases" 
ON public.knowledge_bases 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

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

-- ==============================================
-- KNOWLEDGE DOCUMENTS TABLE
-- ==============================================
CREATE POLICY "Admins can view all knowledge documents" 
ON public.knowledge_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can insert knowledge documents for any user" 
ON public.knowledge_documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all knowledge documents" 
ON public.knowledge_documents 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can delete all knowledge documents" 
ON public.knowledge_documents 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- ==============================================
-- SMS MESSAGES TABLE
-- ==============================================
CREATE POLICY "Admins can view all SMS messages" 
ON public.sms_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can insert SMS messages for any user" 
ON public.sms_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all SMS messages" 
ON public.sms_messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can delete all SMS messages" 
ON public.sms_messages 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- ==============================================
-- CALL HISTORY TABLE
-- ==============================================
CREATE POLICY "Admins can view all call history" 
ON public.call_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can insert call history for any user" 
ON public.call_history 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all call history" 
ON public.call_history 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can delete all call history" 
ON public.call_history 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- ==============================================
-- PHONE NUMBER TABLE
-- ==============================================
CREATE POLICY "Admins can view all phone numbers" 
ON public.phone_number 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can insert phone numbers for any user" 
ON public.phone_number 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all phone numbers" 
ON public.phone_number 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can delete all phone numbers" 
ON public.phone_number 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- ==============================================
-- USER TWILIO CREDENTIALS TABLE
-- ==============================================
CREATE POLICY "Admins can view all Twilio credentials" 
ON public.user_twilio_credentials 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can insert Twilio credentials for any user" 
ON public.user_twilio_credentials 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all Twilio credentials" 
ON public.user_twilio_credentials 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can delete all Twilio credentials" 
ON public.user_twilio_credentials 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- ==============================================
-- USER WHATSAPP CREDENTIALS TABLE
-- ==============================================
CREATE POLICY "Admins can view all WhatsApp credentials" 
ON public.user_whatsapp_credentials 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can insert WhatsApp credentials for any user" 
ON public.user_whatsapp_credentials 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all WhatsApp credentials" 
ON public.user_whatsapp_credentials 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can delete all WhatsApp credentials" 
ON public.user_whatsapp_credentials 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- ==============================================
-- USER CALENDAR CREDENTIALS TABLE
-- ==============================================
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

CREATE POLICY "Admins can insert calendar credentials for any user" 
ON public.user_calendar_credentials 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all calendar credentials" 
ON public.user_calendar_credentials 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

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

-- ==============================================
-- CALENDAR EVENT TYPES TABLE
-- ==============================================
CREATE POLICY "Admins can view all calendar event types" 
ON public.calendar_event_types 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can insert calendar event types for any user" 
ON public.calendar_event_types 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all calendar event types" 
ON public.calendar_event_types 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can delete all calendar event types" 
ON public.calendar_event_types 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

-- ==============================================
-- CAMPAIGN CALLS TABLE
-- ==============================================
CREATE POLICY "Admins can view all campaign calls" 
ON public.campaign_calls 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can insert campaign calls for any user" 
ON public.campaign_calls 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can update all campaign calls" 
ON public.campaign_calls 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);

CREATE POLICY "Admins can delete all campaign calls" 
ON public.campaign_calls 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);
