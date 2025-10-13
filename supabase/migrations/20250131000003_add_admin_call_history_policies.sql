-- Add admin policies for call_history table to allow admins to view all call history
-- This migration ensures admins can access call history for user statistics

-- Allow admins to view all call history
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

-- Allow admins to delete all call history
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

-- Allow admins to update all call history
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
