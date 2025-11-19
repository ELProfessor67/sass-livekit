# Fix for Email Verification Link Expiring

## Problem
Email verification links are expiring immediately (1 second after creation) with error:
- `error=access_denied`
- `error_code=otp_expired`
- `error_description=Email+link+is+invalid+or+has+expired`

## Root Cause
Supabase email verification links have a default expiry time, and the redirect URL might not be properly configured.

## Solution Applied

### 1. Fixed AuthCallback.tsx
- Added proper error handling for expired links
- Better handling of Supabase hash parameters
- Added fallback to custom token verification

### 2. Fixed signup flow
- Removed redundant `send-verification-email` call (Supabase sends it automatically)
- Ensured `emailRedirectTo` is properly set

### 3. Fixed backend verification
- Added proper `redirectTo` option when generating links
- Uses environment variable for site URL

## Additional Steps Required

### 1. Check Supabase Dashboard Settings
Go to Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: Should be `http://localhost:8080` (for local) or your production URL
- **Redirect URLs**: Must include `http://localhost:8080/auth/callback`

### 2. Check Email Template Settings
Go to Supabase Dashboard → Authentication → Email Templates:
- **Confirm signup** template should have proper redirect URL
- Default expiry is usually 1 hour (not 1 second)

### 3. Environment Variables
Make sure these are set:
```env
VITE_SITE_URL=http://localhost:8080
SITE_URL=http://localhost:8080
```

### 4. Test Again
1. Sign up with a new email
2. Check email inbox
3. Click verification link immediately
4. Should redirect to `/auth/callback` and then to login/onboarding

## If Still Not Working

### Option 1: Disable Email Confirmation (Development Only)
In Supabase Dashboard → Authentication → Settings:
- Turn off "Enable email confirmations" (for testing only)

### Option 2: Use Custom Token System
We have a custom token system in place. You can use:
- `/api/v1/user/verify-email?token=YOUR_TOKEN`
- This uses our `verification_tokens` table

### Option 3: Check Supabase Logs
Go to Supabase Dashboard → Logs → Auth Logs
- Check for errors when generating links
- Check for errors when verifying

## Quick Fix for Testing

If you need to test immediately without email verification:

1. Go to Supabase Dashboard → Authentication → Users
2. Find your user
3. Click "Confirm email" button manually
4. User will be verified instantly

This is just for testing - in production, users must verify via email.



