-- Create workflow_executions table to track automation runs
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    call_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'partial')),
    input_data JSONB NOT NULL DEFAULT '{}',
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create workflow_node_logs table to track individual node execution details
CREATE TABLE IF NOT EXISTS public.workflow_node_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'retrying')),
    input JSONB NOT NULL DEFAULT '{}',
    output JSONB NOT NULL DEFAULT '{}',
    error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_call_id ON public.workflow_executions(call_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_node_logs_execution_id ON public.workflow_node_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_node_logs_status ON public.workflow_node_logs(status);

-- Enable RLS
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_node_logs ENABLE ROW LEVEL SECURITY;

-- Policies for workflow_executions
CREATE POLICY "Users can view their own workflow executions"
    ON public.workflow_executions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_executions.workflow_id
        AND w.user_id = auth.uid()
    ));

-- Policies for workflow_node_logs
CREATE POLICY "Users can view their own workflow node logs"
    ON public.workflow_node_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.workflow_executions e
        JOIN public.workflows w ON w.id = e.workflow_id
        WHERE e.id = workflow_node_logs.execution_id
        AND w.user_id = auth.uid()
    ));

-- Service role policies (for the backend to insert logs)
CREATE POLICY "Service role can manage workflow executions"
    ON public.workflow_executions FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage workflow node logs"
    ON public.workflow_node_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at on workflow_executions
CREATE TRIGGER update_workflow_executions_updated_at
    BEFORE UPDATE ON public.workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add a comment to document the schema
COMMENT ON TABLE public.workflow_executions IS 'Stores the high-level status of a workflow automation run triggered by a call.';
COMMENT ON TABLE public.workflow_node_logs IS 'Stores detailed input/output and status of each node within a workflow execution.';
