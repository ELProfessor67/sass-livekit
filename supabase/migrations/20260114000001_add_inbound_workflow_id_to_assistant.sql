ALTER TABLE public.assistant 
ADD COLUMN inbound_workflow_id uuid REFERENCES public.workflows(id);

COMMENT ON COLUMN public.assistant.inbound_workflow_id IS 'ID of the workflow to run for inbound calls to this assistant';
