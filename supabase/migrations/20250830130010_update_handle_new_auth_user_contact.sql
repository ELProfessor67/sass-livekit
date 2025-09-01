-- Update trigger function to also populate users.contact from auth metadata on signup

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, contact)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    (jsonb_build_object(
      'email', NEW.email,
      'phone', NEW.raw_user_meta_data->>'phone',
      'countryCode', NEW.raw_user_meta_data->>'countryCode'
    ))::json
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact = COALESCE(EXCLUDED.contact, public.users.contact);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger remains the same; just ensure it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


