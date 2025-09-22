-- Add n8n settings fields to assistant table
-- These fields will store n8n webhook integration and Google Sheets automation settings

ALTER TABLE public.assistant 
ADD COLUMN n8n_webhook_url TEXT,
ADD COLUMN n8n_auto_create_sheet BOOLEAN DEFAULT false,
ADD COLUMN n8n_drive_folder_id TEXT,
ADD COLUMN n8n_spreadsheet_name_template TEXT,
ADD COLUMN n8n_sheet_tab_template TEXT,
ADD COLUMN n8n_spreadsheet_id TEXT,
ADD COLUMN n8n_sheet_tab TEXT,
ADD COLUMN n8n_save_name BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_email BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_phone BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_summary BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_sentiment BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_labels BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_recording_url BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_transcript_url BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_duration BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_call_direction BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_from_number BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_to_number BOOLEAN DEFAULT false,
ADD COLUMN n8n_save_cost BOOLEAN DEFAULT false,
ADD COLUMN n8n_custom_fields JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.n8n_webhook_url IS 'n8n workflow webhook URL for data integration';
COMMENT ON COLUMN public.assistant.n8n_auto_create_sheet IS 'Whether n8n should automatically create a new Google Sheet';
COMMENT ON COLUMN public.assistant.n8n_drive_folder_id IS 'Google Drive folder ID for sheet creation';
COMMENT ON COLUMN public.assistant.n8n_spreadsheet_name_template IS 'Template for spreadsheet name (e.g., Call Logs - {{assistant.name}})';
COMMENT ON COLUMN public.assistant.n8n_sheet_tab_template IS 'Template for sheet tab name (e.g., {{assistant.name}})';
COMMENT ON COLUMN public.assistant.n8n_spreadsheet_id IS 'Existing Google Spreadsheet ID if not auto-creating';
COMMENT ON COLUMN public.assistant.n8n_sheet_tab IS 'Existing sheet tab name if using existing spreadsheet';
COMMENT ON COLUMN public.assistant.n8n_save_name IS 'Whether to save contact name to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_email IS 'Whether to save contact email to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_phone IS 'Whether to save contact phone to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_summary IS 'Whether to save AI call summary to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_sentiment IS 'Whether to save call sentiment to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_labels IS 'Whether to save call labels/tags to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_recording_url IS 'Whether to save recording URL to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_transcript_url IS 'Whether to save transcript URL to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_duration IS 'Whether to save call duration to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_call_direction IS 'Whether to save call direction (inbound/outbound) to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_from_number IS 'Whether to save from number to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_to_number IS 'Whether to save to number to n8n';
COMMENT ON COLUMN public.assistant.n8n_save_cost IS 'Whether to save call cost to n8n';
COMMENT ON COLUMN public.assistant.n8n_custom_fields IS 'Custom fields configuration for n8n integration';

-- Create index for better query performance on n8n webhook URL
CREATE INDEX idx_assistant_n8n_webhook_url ON public.assistant(n8n_webhook_url) 
WHERE n8n_webhook_url IS NOT NULL;

-- Create index for better query performance on n8n auto create sheet
CREATE INDEX idx_assistant_n8n_auto_create_sheet ON public.assistant(n8n_auto_create_sheet) 
WHERE n8n_auto_create_sheet = true;
