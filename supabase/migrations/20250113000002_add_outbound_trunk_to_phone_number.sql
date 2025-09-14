-- Add outbound trunk fields to phone_number table
ALTER TABLE public.phone_number 
ADD COLUMN outbound_trunk_id TEXT,
ADD COLUMN outbound_trunk_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.phone_number.outbound_trunk_id IS 'LiveKit outbound trunk ID for making calls from this number';
COMMENT ON COLUMN public.phone_number.outbound_trunk_name IS 'LiveKit outbound trunk name for making calls from this number';
