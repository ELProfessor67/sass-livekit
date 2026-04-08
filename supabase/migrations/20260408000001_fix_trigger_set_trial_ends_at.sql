-- Fix handle_new_auth_user trigger to also set trial_ends_at when trial is enabled
-- Previously, the trigger allocated trial minutes but never set trial_ends_at,
-- so users had minutes but no trial badge/countdown in the UI.

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
  v_trial_ends_at TIMESTAMPTZ := NULL;
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

  -- Determine tenant
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

  -- Apply trial minutes and end date if enabled
  IF trial_enabled THEN
    v_minutes_limit := trial_minutes;
    v_trial_ends_at := NOW() + (COALESCE(trial_days, 7) || ' days')::INTERVAL;
  ELSE
    v_minutes_limit := 0;
    v_trial_ends_at := NULL;
  END IF;

  INSERT INTO public.users (
    id,
    name,
    slug_name,
    tenant,
    role,
    minutes_limit,
    minutes_used,
    is_unlimited,
    trial_ends_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    user_slug,
    user_tenant,
    user_role,
    v_minutes_limit,
    0,
    false,
    v_trial_ends_at
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug_name = COALESCE(EXCLUDED.slug_name, users.slug_name),
    tenant = COALESCE(EXCLUDED.tenant, users.tenant),
    role = COALESCE(EXCLUDED.role, users.role),
    minutes_limit = COALESCE(users.minutes_limit, EXCLUDED.minutes_limit),
    minutes_used = COALESCE(users.minutes_used, 0),
    -- Only set trial_ends_at if it hasn't been set yet
    trial_ends_at = COALESCE(users.trial_ends_at, EXCLUDED.trial_ends_at);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
