-- Update the handle_new_auth_user trigger to support free trials and unlimited flags
-- This script updates the existing trigger function to award trial minutes based on tenant config

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_slug TEXT;
  is_whitelabel BOOLEAN;
  user_role TEXT;
  user_tenant TEXT;
  
  -- Trial settings
  trial_enabled BOOLEAN := false;
  trial_minutes INTEGER := 0;
  trial_days INTEGER := 0;
  v_minutes_limit INTEGER := 0;
BEGIN
  -- Extract white label data from metadata
  user_slug := NEW.raw_user_meta_data->>'slug';
  is_whitelabel := (NEW.raw_user_meta_data->>'whitelabel')::boolean;
  user_tenant := NEW.raw_user_meta_data->>'tenant';
  
  -- Set role to admin if white label, otherwise default
  IF is_whitelabel AND user_slug IS NOT NULL THEN
    user_role := 'admin';
  ELSE
    user_role := 'user';
  END IF;
  
  -- Determine tenant: use from metadata if provided, otherwise use slug, otherwise default to main
  IF user_tenant IS NOT NULL THEN
    user_tenant := user_tenant;
  ELSIF user_slug IS NOT NULL THEN
    user_tenant := user_slug;
  ELSE
    user_tenant := 'main';
  END IF;

  -- Fetch trial settings for this tenant
  SELECT 
    free_trial_enabled, 
    COALESCE(free_trial_minutes, 0), 
    COALESCE(free_trial_days, 0)
  INTO 
    trial_enabled, 
    trial_minutes, 
    trial_days
  FROM public.minutes_pricing_config
  WHERE tenant = user_tenant OR (user_tenant = 'main' AND tenant IS NULL)
  LIMIT 1;

  -- Apply trial minutes if enabled
  IF trial_enabled THEN
    v_minutes_limit := trial_minutes;
  ELSE
    v_minutes_limit := 0;
  END IF;
  
  INSERT INTO public.users (
    id, 
    name,
    slug_name,
    tenant,
    role,
    minutes_limit,
    minutes_used,
    is_unlimited
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    user_slug,
    user_tenant,
    user_role,
    v_minutes_limit,
    0,     -- Initialize minutes_used to 0
    false  -- New users are NOT unlimited by default (unless it's a trial, but trials have limits)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug_name = COALESCE(EXCLUDED.slug_name, users.slug_name),
    tenant = COALESCE(EXCLUDED.tenant, users.tenant),
    role = COALESCE(EXCLUDED.role, users.role),
    -- Update minutes_limit only if user is new or hasn't had limits set
    minutes_limit = COALESCE(users.minutes_limit, EXCLUDED.minutes_limit),
    minutes_used = COALESCE(users.minutes_used, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
