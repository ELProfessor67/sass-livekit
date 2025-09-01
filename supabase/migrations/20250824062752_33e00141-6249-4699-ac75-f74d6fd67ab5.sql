-- Fix function search path
ALTER FUNCTION public.generate_invitation_token() SET search_path = public;