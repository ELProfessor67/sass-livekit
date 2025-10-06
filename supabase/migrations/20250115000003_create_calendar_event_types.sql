-- Create calendar_event_types table for managing multiple event types per calendar credential
CREATE TABLE public.calendar_event_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_credential_id UUID NOT NULL REFERENCES public.user_calendar_credentials(id) ON DELETE CASCADE,
  event_type_id TEXT NOT NULL,
  event_type_slug TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.calendar_event_types IS 'Event types for calendar integrations';
COMMENT ON COLUMN public.calendar_event_types.calendar_credential_id IS 'Reference to the calendar credential';
COMMENT ON COLUMN public.calendar_event_types.event_type_id IS 'Event type ID from calendar provider (e.g., Cal.com)';
COMMENT ON COLUMN public.calendar_event_types.event_type_slug IS 'Event type slug (e.g., team/demo-call)';
COMMENT ON COLUMN public.calendar_event_types.label IS 'User-friendly label for this event type';
COMMENT ON COLUMN public.calendar_event_types.description IS 'Description of the event type';
COMMENT ON COLUMN public.calendar_event_types.duration_minutes IS 'Duration of the event in minutes';

-- Create indexes for better query performance
CREATE INDEX idx_calendar_event_types_credential_id ON public.calendar_event_types(calendar_credential_id);
CREATE INDEX idx_calendar_event_types_slug ON public.calendar_event_types(event_type_slug);
CREATE UNIQUE INDEX idx_calendar_event_types_unique_slug_per_credential 
ON public.calendar_event_types(calendar_credential_id, event_type_slug);

-- Enable RLS (Row Level Security)
ALTER TABLE public.calendar_event_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view event types for their calendar credentials" ON public.calendar_event_types
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_calendar_credentials 
      WHERE id = calendar_credential_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert event types for their calendar credentials" ON public.calendar_event_types
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_calendar_credentials 
      WHERE id = calendar_credential_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update event types for their calendar credentials" ON public.calendar_event_types
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_calendar_credentials 
      WHERE id = calendar_credential_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete event types for their calendar credentials" ON public.calendar_event_types
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_calendar_credentials 
      WHERE id = calendar_credential_id 
      AND user_id = auth.uid()
    )
  );

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_calendar_event_types_updated_at 
  BEFORE UPDATE ON public.calendar_event_types 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
