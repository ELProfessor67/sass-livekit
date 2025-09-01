-- RPC: phone_exists(phone text, country text) -> boolean
-- Normalizes phone digits and compares with stored contact JSON

CREATE OR REPLACE FUNCTION public.phone_exists(_phone text, _country text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE regexp_replace(coalesce(u.contact->>'phone',''), '\\D', '', 'g') =
          regexp_replace(coalesce(_phone, ''), '\\D', '', 'g')
      AND lower(coalesce(u.contact->>'countryCode','')) = lower(coalesce(_country, ''))
  );
$$;

-- Allow anon/auth to execute if needed (adjust as per your security model)
GRANT EXECUTE ON FUNCTION public.phone_exists(text, text) TO anon, authenticated;


