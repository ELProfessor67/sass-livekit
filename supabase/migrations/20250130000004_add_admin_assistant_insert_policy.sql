-- Add admin policy for inserting assistants on behalf of other users
-- This allows support/admin users to create assistants for other users

-- Allow admins to insert assistants for any user
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
