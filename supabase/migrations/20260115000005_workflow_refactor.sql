-- Create assistant_workflows junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.assistant_workflows (
  assistant_id UUID REFERENCES public.assistant(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (assistant_id, workflow_id)
);

-- Create workflow_delayed_executions table for persistent delays
CREATE TABLE IF NOT EXISTS public.workflow_delayed_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  current_node_id TEXT NOT NULL,
  context JSONB NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.assistant_workflows IS 'Junction table linking assistants to multiple workflows';
COMMENT ON TABLE public.workflow_delayed_executions IS 'Stores workflow runs that are waiting for a temporal delay to expire';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_delayed_status_time ON public.workflow_delayed_executions(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_workflow_delayed_workflow_id ON public.workflow_delayed_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_delayed_user_id ON public.workflow_delayed_executions(user_id);

-- Enable RLS
ALTER TABLE public.assistant_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_delayed_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assistant_workflows
CREATE POLICY "Users can manage their assistant's workflows" ON public.assistant_workflows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assistant a
      WHERE a.id = assistant_id AND a.user_id = auth.uid()
    )
  );

-- RLS Policies for workflow_delayed_executions
CREATE POLICY "Users can view their own delayed executions" ON public.workflow_delayed_executions
  FOR SELECT USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_workflow_delayed_executions_updated_at 
  BEFORE UPDATE ON public.workflow_delayed_executions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration to link existing assistants to their inbound_workflow_id if present
INSERT INTO public.assistant_workflows (assistant_id, workflow_id)
SELECT id, inbound_workflow_id 
FROM public.assistant 
WHERE inbound_workflow_id IS NOT NULL
ON CONFLICT DO NOTHING;
