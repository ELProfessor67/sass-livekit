-- Create workspace_members table
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id),
  UNIQUE(workspace_id, email)
);

-- Create workspace_invitations table
CREATE TABLE public.workspace_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- Enable Row Level Security
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_members
CREATE POLICY "Users can view members of their workspace" 
ON public.workspace_members 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert members to their workspace" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update members in their workspace" 
ON public.workspace_members 
FOR UPDATE 
USING (
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete members from their workspace" 
ON public.workspace_members 
FOR DELETE 
USING (
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
);

-- RLS policies for workspace_invitations
CREATE POLICY "Users can view invitations for their workspace" 
ON public.workspace_invitations 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create invitations for their workspace" 
ON public.workspace_invitations 
FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update invitations for their workspace" 
ON public.workspace_invitations 
FOR UPDATE 
USING (
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete invitations for their workspace" 
ON public.workspace_invitations 
FOR DELETE 
USING (
  workspace_id IN (
    SELECT ws.id FROM public.workspace_settings ws WHERE ws.user_id = auth.uid()
  )
);

-- Add trigger for automatic timestamp updates on workspace_members
CREATE TRIGGER update_workspace_members_updated_at
BEFORE UPDATE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate invitation tokens
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;