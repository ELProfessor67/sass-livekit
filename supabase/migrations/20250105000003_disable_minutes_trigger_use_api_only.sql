-- Disable the database trigger for adding minutes
-- All minutes addition is now handled in the API code, not via triggers
-- This prevents double-counting and gives us full control

-- Drop the trigger (but keep the function in case we need it later)
DROP TRIGGER IF EXISTS add_purchased_minutes_to_user_trigger ON public.minutes_purchases;

-- Add comment explaining the change
COMMENT ON FUNCTION public.add_purchased_minutes_to_user() IS 
'DEPRECATED: This function is no longer used. Minutes are now added directly in the API code.
The trigger has been disabled to prevent double-counting. All minutes addition logic is in server/routes/minutes-pricing.js';

-- Note: We keep the function in case we need to re-enable it later, but the trigger is disabled
-- If you want to completely remove it, you can run:
-- DROP FUNCTION IF EXISTS public.add_purchased_minutes_to_user();

