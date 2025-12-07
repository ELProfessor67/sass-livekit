-- Update the trigger function to handle white label fields
-- This ensures white label data is set when a user signs up

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
    -- Tenant explicitly provided in metadata (e.g., from hostname extraction)
    user_tenant := user_tenant;
  ELSIF user_slug IS NOT NULL THEN
    -- White label admin: tenant = slug
    user_tenant := user_slug;
  ELSE
    -- Default to main
    user_tenant := 'main';
  END IF;
  
  INSERT INTO public.users (
    id, 
    name,
    slug_name,
    tenant,
    role,
    minutes_limit,
    minutes_used
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    user_slug,
    user_tenant,
    user_role,
    0, -- Initialize minutes_limit to 0
    0  -- Initialize minutes_used to 0
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug_name = COALESCE(EXCLUDED.slug_name, users.slug_name),
    tenant = COALESCE(EXCLUDED.tenant, users.tenant),
    role = COALESCE(EXCLUDED.role, users.role),
    -- Only update minutes if they are NULL (for existing users that might not have these fields)
    minutes_limit = COALESCE(users.minutes_limit, 0),
    minutes_used = COALESCE(users.minutes_used, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


