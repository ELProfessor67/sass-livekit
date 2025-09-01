-- Enforce unique phone number (with country code) across users
-- Normalizes phone by removing non-digits; pairs with countryCode from contact JSON

CREATE UNIQUE INDEX IF NOT EXISTS users_unique_phone_country_idx
ON public.users (
  -- normalized phone digits only
  regexp_replace(coalesce((contact ->> 'phone')::text, ''), '\\D', '', 'g'),
  -- country code (e.g., +1)
  lower(coalesce((contact ->> 'countryCode')::text, ''))
)
WHERE (contact ->> 'phone') IS NOT NULL;


