# OAuth Redirect URIs Configuration

This document lists the redirect URIs you need to configure in your OAuth provider apps.

## Slack OAuth App Configuration

**Redirect URI to add:**
```
https://your-backend-domain.com/api/v1/connections/slack/callback
```

**For local development:**
```
http://localhost:4000/api/v1/connections/slack/callback
```

### Steps:
1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Select your app (or create a new one)
3. Go to **OAuth & Permissions** in the sidebar
4. Scroll to **Redirect URLs**
5. Click **Add New Redirect URL**
6. Add the redirect URI above
7. Click **Save URLs**

### Required Scopes:
- `chat:write` - Send messages
- `channels:read` - Read channel information
- `users:read` - Read user information
- `team:read` - Read workspace information

---

## Facebook OAuth App Configuration

**Redirect URI to add:**
```
https://your-backend-domain.com/api/v1/connections/facebook/callback
```

**For local development:**
```
http://localhost:4000/api/v1/connections/facebook/callback
```

### Steps:
1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Select your app (or create a new one)
3. Go to **Settings** → **Basic**
4. Scroll to **Valid OAuth Redirect URIs**
5. Click **Add URI**
6. Add the redirect URI above
7. Click **Save Changes**

### Required Permissions:
- `pages_show_list` - List pages
- `pages_read_engagement` - Read page engagement
- `pages_manage_metadata` - Manage page metadata
- `leads_retrieval` - Retrieve lead forms
- `public_profile` - Basic profile information

---

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Slack
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret

# Facebook
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Backend URL (used for redirect URIs)
BACKEND_URL=https://your-backend-domain.com
# For local: BACKEND_URL=http://localhost:4000

# Frontend URL (where users are redirected after OAuth)
FRONTEND_URL=https://your-frontend-domain.com
# For local: FRONTEND_URL=http://localhost:8080
```

---

## Testing

1. **Slack:**
   - Go to Settings → Integrations
   - Click "Connect" on Slack
   - You should be redirected to Slack authorization
   - After authorizing, you'll be redirected back to the integrations page

2. **Facebook:**
   - Go to Settings → Integrations
   - Click "Connect" on Facebook
   - You should be redirected to Facebook authorization
   - After authorizing, you'll be redirected back to the integrations page

---

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Make sure the redirect URI in your OAuth app settings exactly matches the one in your code
- Check for trailing slashes, http vs https, etc.

**Error: "Invalid OAuth redirect_uri"**
- Verify the redirect URI is added in your OAuth app settings
- For Facebook, make sure the app is in "Live" mode or you're using a test user

**Connection not saving:**
- Check backend logs for errors
- Verify database migration has been run
- Check that `BACKEND_URL` and `FRONTEND_URL` are set correctly
