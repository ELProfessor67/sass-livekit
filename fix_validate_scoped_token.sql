-- Fix the validate_scoped_token function to resolve the ambiguous column reference error
-- Run this in the Supabase SQL editor

CREATE OR REPLACE FUNCTION validate_scoped_token(token_input TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  session_id UUID,
  admin_user_id UUID,
  target_user_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  input_token_hash TEXT;
BEGIN
  input_token_hash := encode(digest(token_input, 'sha256'), 'hex');
  
  RETURN QUERY
  SELECT 
    CASE 
      WHEN st.is_revoked = FALSE 
       AND st.expires_at > NOW() 
       AND ss.status = 'active' 
      THEN TRUE 
      ELSE FALSE 
    END as is_valid,
    ss.id as session_id,
    ss.admin_user_id,
    ss.target_user_id,
    ss.expires_at
  FROM public.scoped_tokens st
  JOIN public.support_sessions ss ON st.session_id = ss.id
  WHERE st.token_hash = input_token_hash;
END;
$$ LANGUAGE plpgsql;
