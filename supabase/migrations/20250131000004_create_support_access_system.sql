-- Create support_sessions table for tracking admin support access
CREATE TABLE public.support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 15 AND 120),
  scoped_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'completed')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_log table for tracking all support access actions
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.support_sessions(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'support_access_started',
    'support_access_ended',
    'support_access_expired',
    'support_access_revoked',
    'user_viewed',
    'user_edited',
    'user_deleted',
    'campaign_viewed',
    'campaign_edited',
    'campaign_deleted',
    'contact_viewed',
    'contact_edited',
    'contact_deleted',
    'settings_viewed',
    'settings_edited',
    'data_exported',
    'token_generated',
    'token_revoked'
  )),
  resource_type TEXT, -- 'user', 'campaign', 'contact', 'settings', etc.
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scoped_tokens table for managing temporary access tokens
CREATE TABLE public.scoped_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE, -- Hashed version of the token
  session_id UUID NOT NULL REFERENCES public.support_sessions(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{}', -- Scoped permissions
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoped_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_sessions
CREATE POLICY "Admins can view all support sessions" 
ON public.support_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can create support sessions" 
ON public.support_sessions 
FOR INSERT 
WITH CHECK (
  auth.uid() = admin_user_id AND
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update their own support sessions" 
ON public.support_sessions 
FOR UPDATE 
USING (
  auth.uid() = admin_user_id AND
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for audit_log
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "System can insert audit logs" 
ON public.audit_log 
FOR INSERT 
WITH CHECK (true); -- Allow system to insert audit logs

-- RLS Policies for scoped_tokens
CREATE POLICY "Admins can view scoped tokens" 
ON public.scoped_tokens 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "System can manage scoped tokens" 
ON public.scoped_tokens 
FOR ALL 
USING (true); -- Allow system to manage tokens

-- Create indexes for better performance
CREATE INDEX idx_support_sessions_admin_user_id ON public.support_sessions(admin_user_id);
CREATE INDEX idx_support_sessions_target_user_id ON public.support_sessions(target_user_id);
CREATE INDEX idx_support_sessions_status ON public.support_sessions(status);
CREATE INDEX idx_support_sessions_expires_at ON public.support_sessions(expires_at);
CREATE INDEX idx_support_sessions_scoped_token ON public.support_sessions(scoped_token);

CREATE INDEX idx_audit_log_session_id ON public.audit_log(session_id);
CREATE INDEX idx_audit_log_admin_user_id ON public.audit_log(admin_user_id);
CREATE INDEX idx_audit_log_action_type ON public.audit_log(action_type);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX idx_audit_log_resource_type ON public.audit_log(resource_type);

CREATE INDEX idx_scoped_tokens_session_id ON public.scoped_tokens(session_id);
CREATE INDEX idx_scoped_tokens_expires_at ON public.scoped_tokens(expires_at);
CREATE INDEX idx_scoped_tokens_token_hash ON public.scoped_tokens(token_hash);

-- Create trigger for updated_at
CREATE TRIGGER update_support_sessions_updated_at 
    BEFORE UPDATE ON public.support_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_support_sessions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update expired sessions
  UPDATE public.support_sessions 
  SET status = 'expired', ended_at = NOW()
  WHERE status = 'active' AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Revoke associated tokens
  UPDATE public.scoped_tokens 
  SET is_revoked = TRUE
  WHERE session_id IN (
    SELECT id FROM public.support_sessions 
    WHERE status = 'expired' AND expires_at < NOW()
  );
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate scoped token
CREATE OR REPLACE FUNCTION generate_scoped_token(session_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  token_hash TEXT;
BEGIN
  -- Generate a secure random token
  token := encode(gen_random_bytes(32), 'base64');
  token_hash := encode(digest(token, 'sha256'), 'hex');
  
  -- Store the hashed token
  INSERT INTO public.scoped_tokens (token_hash, session_id, expires_at)
  SELECT token_hash, session_uuid, expires_at
  FROM public.support_sessions
  WHERE id = session_uuid;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to validate scoped token
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

-- Function to log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_session_id UUID DEFAULT NULL,
  p_admin_user_id UUID DEFAULT NULL,
  p_target_user_id UUID DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    session_id,
    admin_user_id,
    target_user_id,
    action_type,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_session_id,
    COALESCE(p_admin_user_id, auth.uid()),
    p_target_user_id,
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;
