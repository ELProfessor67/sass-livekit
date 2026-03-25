-- Run this in your Supabase SQL Editor to fix the http_post error

-- 1. Enable the http extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Drop existing overloads to avoid "function name is not unique" error
DROP FUNCTION IF EXISTS extensions.http_post(text, jsonb, jsonb);
DROP FUNCTION IF EXISTS extensions.http_post(text, text, text);

-- 3. Create the exact wrapper function that Supabase webhooks expect
CREATE OR REPLACE FUNCTION extensions.http_post(
  url text,
  body jsonb DEFAULT '{}'::jsonb,
  headers jsonb DEFAULT '{}'::jsonb
) RETURNS json AS $$
DECLARE
  response extensions.http_response;
BEGIN
  -- Convert headers jsonb to array of http_header
  SELECT * FROM extensions.http((
    'POST',
    url,
    (SELECT ARRAY_AGG(extensions.http_header(key, value)) FROM jsonb_each_text(headers)),
    'application/json',
    body::text
  )::extensions.http_request) INTO response;
  
  -- Return response content as json
  RETURN response.content::json;
EXCEPTION WHEN OTHERS THEN
  -- Fallback/Error logging
  RAISE WARNING 'http_post failed: %', SQLERRM;
  RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION extensions.http_post IS 'Wrapper function for pgsql-http extension used by Supabase webhooks';
