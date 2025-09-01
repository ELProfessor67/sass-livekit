-- Extend handle_new_auth_user to accept either contactPhone or phone from metadata

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_phone text;
  meta_country text;
BEGIN
  meta_phone := coalesce(NEW.raw_user_meta_data->>'contactPhone', NEW.raw_user_meta_data->>'phone');
  meta_country := NEW.raw_user_meta_data->>'countryCode';

  INSERT INTO public.users (id, name, contact)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    (jsonb_build_object(
      'email', NEW.email,
      'phone', meta_phone,
      'countryCode', meta_country
    ))::json
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact = COALESCE(EXCLUDED.contact, public.users.contact);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger remains the same
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


