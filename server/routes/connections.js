import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Normalize client IP so initiation and callback match (IPv6-mapped IPv4, x-forwarded-for)
function getClientIp(req) {
  const raw = (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) || req.ip || '';
  const normalized = raw.replace(/^::ffff:/i, '');
  return normalized || raw;
}

// Parse a single cookie value from Cookie header (no cookie-parser dependency)
function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

// Helper function to get frontend URL with proper fallbacks
const getFrontendUrl = () => {
  const url = process.env.FRONTEND_URL || process.env.VITE_BACKEND_URL;
  // Handle both undefined and string "undefined"/"null" cases
  if (url && url !== 'undefined' && url !== 'null' && url.trim() !== '') {
    let trimmedUrl = url.trim();
    // Ensure URL has a protocol (http:// or https://)
    // If it doesn't start with http:// or https://, add https://
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      // Default to https for production-like domains, http for localhost
      if (trimmedUrl.includes('localhost') || trimmedUrl.includes('127.0.0.1')) {
        trimmedUrl = `http://${trimmedUrl}`;
      } else {
        trimmedUrl = `https://${trimmedUrl}`;
      }
    }
    return trimmedUrl;
  }
  // Default fallback based on environment
  return process.env.NODE_ENV === 'production'
    ? 'https://yourdomain.com' // Should be set in production
    : 'http://localhost:8080'; // Vite default port (customized to 8080)
};

// List user's connections
router.get('/', async (req, res) => {
  const { userId, provider } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    let query = supabase
      .from('connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[Connections] Error fetching connections:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ connections: data || [] });
  } catch (err) {
    console.error('[Connections] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Slack OAuth initiation
router.get('/slack/auth', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send('userId is required');
  }

  const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
  if (!SLACK_CLIENT_ID) {
    console.error('[Slack Auth] SLACK_CLIENT_ID is not configured');
    return res.status(500).send('Slack Client ID is not configured on the server.');
  }

  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  const scopes = 'chat:write,channels:read,users:read,team:read';
  const redirectUri = `${process.env.BACKEND_URL}/api/v1/connections/slack/callback`;

  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  console.log('[Slack Auth] Redirecting to Slack OAuth');
  res.redirect(authUrl);
});

// Slack OAuth callback
router.get('/slack/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // Decode state
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    if (!userId) {
      throw new Error('Missing userId in state');
    }

    const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
    const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL}/api/v1/connections/slack/callback`;

    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
      throw new Error('Slack credentials not configured');
    }

    // Exchange code for token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.ok || tokenData.error) {
      throw new Error(tokenData.error || 'Failed to exchange code for token');
    }

    // Get workspace info
    const teamRes = await fetch(`https://slack.com/api/team.info?token=${tokenData.access_token}`);
    const teamData = await teamRes.json();

    if (!teamData.ok) {
      throw new Error(teamData.error || 'Failed to get team info');
    }

    // Save to connections table
    const { error: insertError } = await supabase
      .from('connections')
      .upsert({
        user_id: userId,
        provider: 'slack',
        label: `${teamData.team.name} Workspace`,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        workspace_id: tokenData.team.id,
        workspace_name: teamData.team.name,
        is_active: true,
        metadata: {
          team: teamData.team,
          authed_user: tokenData.authed_user
        }
      }, {
        onConflict: 'connections_user_provider_workspace_unique',
        ignoreDuplicates: false
      });

    if (insertError) {
      console.error('[Slack Callback] Error saving connection:', insertError);
      throw insertError;
    }

    console.log('[Slack Callback] Successfully saved Slack connection');
    // Build redirect URL - MUST redirect to FRONTEND_URL, NOT backend API
    const frontendUrl = getFrontendUrl();

    // Safety check: ensure we're not accidentally using backend URL
    const backendUrl = process.env.BACKEND_URL || '';
    if (frontendUrl.includes(backendUrl) && backendUrl) {
      console.error('[Slack Callback] ERROR: Frontend URL appears to be backend URL!', { frontendUrl, backendUrl });
    }

    const redirectUrl = `${frontendUrl}/settings?tab=integrations&status=connected&provider=slack`;
    console.log('[Slack Callback] Redirecting to frontend:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('[Slack Callback] Error:', err);
    // Build redirect URL - MUST redirect to FRONTEND_URL, NOT backend API
    const frontendUrl = getFrontendUrl();
    const errorRedirect = `${frontendUrl}/settings?tab=integrations&status=error&provider=slack`;
    console.log('[Slack Callback] Error redirect to frontend:', errorRedirect);
    res.redirect(errorRedirect);
  }
});

// Facebook OAuth initiation - Phase 1: Login only
router.get('/facebook/auth', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send('userId is required');
  }

  const FB_APP_ID = process.env.FACEBOOK_APP_ID;
  if (!FB_APP_ID) {
    console.error('[Facebook Auth] FACEBOOK_APP_ID is not configured');
    return res.status(500).send('Facebook App ID is not configured on the server.');
  }

  const state = Buffer.from(JSON.stringify({ userId, phase: 'login' })).toString('base64');
  // Phase 1: Only request basic login scopes
  const scopes = 'email,public_profile';

  const redirectUri = `${process.env.BACKEND_URL}/api/v1/connections/facebook/callback`;

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;

  console.log('[Facebook Auth Phase 1] Redirecting to Facebook OAuth (login only)');
  res.redirect(authUrl);
});

// Facebook OAuth initiation - Phase 2: Page permissions
router.get('/facebook/pages/auth', (req, res) => {
  const { userId, connectionId } = req.query;

  if (!userId || !connectionId) {
    return res.status(400).send('userId and connectionId are required');
  }

  const FB_APP_ID = process.env.FACEBOOK_APP_ID;
  if (!FB_APP_ID) {
    console.error('[Facebook Pages Auth] FACEBOOK_APP_ID is not configured');
    return res.status(500).send('Facebook App ID is not configured on the server.');
  }

  const state = Buffer.from(JSON.stringify({ userId, connectionId, phase: 'pages' })).toString('base64');
  // Phase 2: Request page permissions
  const scopes = 'pages_show_list,pages_read_engagement';

  const redirectUri = `${process.env.BACKEND_URL}/api/v1/connections/facebook/pages/callback`;

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;

  console.log('[Facebook Auth Phase 2] Redirecting to Facebook OAuth (page permissions)');
  res.redirect(authUrl);
});

// Facebook OAuth callback - Phase 1: Login only
router.get('/facebook/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId, phase } = stateData;

    if (!userId || phase !== 'login') {
      throw new Error('Invalid state or phase');
    }

    const FB_APP_ID = process.env.FACEBOOK_APP_ID;
    const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.BACKEND_URL}/api/v1/connections/facebook/callback`;

    if (!FB_APP_ID || !FB_APP_SECRET) {
      throw new Error('Facebook credentials not configured');
    }

    // Exchange code for access token
    const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${FB_APP_SECRET}&code=${code}`);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message);
    }

    const accessToken = tokenData.access_token;

    // Get user info
    const userRes = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`);
    const userData = await userRes.json();

    if (userData.error) {
      throw new Error(userData.error.message);
    }

    // Save to connections table (Phase 1: basic login only)
    // First, try to find existing connection
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .eq('workspace_id', userData.id)
      .maybeSingle();

    const connectionData = {
      user_id: userId,
      provider: 'facebook',
      label: `Facebook Account (${userData.name || userData.id})`,
      access_token: accessToken,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      workspace_id: userData.id, // Facebook user ID
      is_active: true,
      metadata: {
        user: userData,
        app_id: FB_APP_ID,
        has_page_permissions: false // Mark that page permissions are not yet granted
      }
    };

    let connection;
    let connectionId;

    if (existingConnection) {
      // Update existing connection
      const { data: updatedConnection, error: updateError } = await supabase
        .from('connections')
        .update(connectionData)
        .eq('id', existingConnection.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Facebook Callback Phase 1] Error updating connection:', updateError);
        throw updateError;
      }
      connection = updatedConnection;
      connectionId = existingConnection.id;
    } else {
      // Insert new connection
      const { data: newConnection, error: insertError } = await supabase
        .from('connections')
        .insert(connectionData)
        .select()
        .single();

      if (insertError) {
        console.error('[Facebook Callback Phase 1] Error inserting connection:', insertError);
        throw insertError;
      }
      connection = newConnection;
      connectionId = newConnection?.id;
    }

    if (!connectionId) {
      console.error('[Facebook Callback Phase 1] Connection ID is missing after save');
      throw new Error('Failed to retrieve connection ID after save');
    }

    console.log('[Facebook Callback Phase 1] Successfully saved Facebook connection (login only)', { connectionId });

    // Build redirect URL - MUST redirect to FRONTEND_URL, NOT backend API
    const frontendUrl = getFrontendUrl();

    // Safety check: ensure we're not accidentally using backend URL
    const backendUrl = process.env.BACKEND_URL || '';
    if (frontendUrl.includes(backendUrl) && backendUrl) {
      console.error('[Facebook Callback Phase 1] ERROR: Frontend URL appears to be backend URL!', { frontendUrl, backendUrl });
    }

    // Ensure frontend URL doesn't contain /api/ paths
    if (frontendUrl.includes('/api/')) {
      console.error('[Facebook Callback Phase 1] ERROR: Frontend URL contains /api/ path!', { frontendUrl });
    }

    let redirectUrl = `${frontendUrl}/settings?tab=integrations&status=connected&provider=facebook&phase=1`;
    if (connectionId && connectionId !== 'undefined' && connectionId !== 'null') {
      redirectUrl += `&connectionId=${encodeURIComponent(connectionId)}`;
    } else {
      console.warn('[Facebook Callback Phase 1] Connection ID not available or invalid, redirecting without it', { connectionId });
    }

    console.log('[Facebook Callback Phase 1] Redirecting to frontend:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('[Facebook Callback Phase 1] Error:', err);
    // Build redirect URL - MUST redirect to FRONTEND_URL, NOT backend API
    const frontendUrl = getFrontendUrl();
    const errorRedirect = `${frontendUrl}/settings?tab=integrations&status=error&provider=facebook`;
    console.log('[Facebook Callback Phase 1] Error redirect to frontend:', errorRedirect);
    res.redirect(errorRedirect);
  }
});

// Facebook OAuth callback - Phase 2: Page permissions
router.get('/facebook/pages/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId, connectionId, phase } = stateData;

    if (!userId || !connectionId || phase !== 'pages') {
      throw new Error('Invalid state or phase');
    }

    const FB_APP_ID = process.env.FACEBOOK_APP_ID;
    const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.BACKEND_URL}/api/v1/connections/facebook/pages/callback`;

    if (!FB_APP_ID || !FB_APP_SECRET) {
      throw new Error('Facebook credentials not configured');
    }

    // Exchange code for access token with page permissions
    const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${FB_APP_SECRET}&code=${code}`);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message);
    }

    const accessToken = tokenData.access_token;

    // Verify the connection exists and belongs to the user
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .single();

    if (connectionError || !connection) {
      throw new Error('Connection not found or access denied');
    }

    // Update connection with new token that has page permissions
    const { error: updateError } = await supabase
      .from('connections')
      .update({
        access_token: accessToken,
        refresh_token: tokenData.refresh_token || connection.refresh_token,
        token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : connection.token_expires_at,
        metadata: {
          ...connection.metadata,
          has_page_permissions: true // Mark that page permissions are now granted
        }
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('[Facebook Callback Phase 2] Error updating connection:', updateError);
      throw updateError;
    }

    console.log('[Facebook Callback Phase 2] Successfully updated Facebook connection with page permissions');
    // Build redirect URL - MUST redirect to FRONTEND_URL, NOT backend API
    const frontendUrl = getFrontendUrl();

    // Safety check: ensure we're not accidentally using backend URL
    const backendUrl = process.env.BACKEND_URL || '';
    if (frontendUrl.includes(backendUrl) && backendUrl) {
      console.error('[Facebook Callback Phase 2] ERROR: Frontend URL appears to be backend URL!', { frontendUrl, backendUrl });
    }

    const redirectUrl = `${frontendUrl}/settings?tab=integrations&status=connected&provider=facebook&phase=2`;
    console.log('[Facebook Callback Phase 2] Redirecting to frontend:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('[Facebook Callback Phase 2] Error:', err);
    // Build redirect URL - MUST redirect to FRONTEND_URL, NOT backend API
    const frontendUrl = getFrontendUrl();
    const errorRedirect = `${frontendUrl}/settings?tab=integrations&status=error&provider=facebook&phase=2`;
    console.log('[Facebook Callback Phase 2] Error redirect to frontend:', errorRedirect);
    res.redirect(errorRedirect);
  }
});

// GoHighLevel OAuth initiation
router.get('/gohighlevel/auth', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send('userId is required');
  }

  const GHL_CLIENT_ID = process.env.GOHIGHLEVEL_CLIENT_ID || process.env.GOHIGHLEVEL_APP_ID;
  if (!GHL_CLIENT_ID) {
    console.error('[GHL Auth] GOHIGHLEVEL_CLIENT_ID / GOHIGHLEVEL_APP_ID is not configured');
    return res.status(500).send('GoHighLevel Client ID is not configured on the server.');
  }

  // Generate a nonce to track this session since GHL drops the state parameter
  const nonce = crypto.randomUUID();

  // Store the userId keyed by nonce (use normalized IP so callback can match)
  const clientIp = getClientIp(req);
  const { error: stateError } = await supabase
    .from('oauth_states')
    .insert({
      nonce,
      user_id: userId,
      provider: 'gohighlevel',
      ip_address: clientIp
    });

  if (stateError) {
    console.error('[GHL Auth] Error saving oauth state:', stateError);
    // Continue anyway as fallback, though it might fail if state is dropped
  }

  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  // Scopes needed for contacts and webhooks
  const scopes = 'contacts.readonly contacts.write locations.readonly webhooks.write webhooks.readonly';
  const redirectUri = `${process.env.BACKEND_URL}/api/v1/connections/gogo/callback`;

  // We add nonce to the URL. GHL often keeps custom params while dropping state.
  const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${GHL_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&nonce=${nonce}`;

  // Cookie fallback: when GHL strips query params we can still identify the user via this cookie
  res.setHeader('Set-Cookie', `ghl_oauth_nonce=${nonce}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

  console.log('[GHL Auth] Redirecting to GoHighLevel OAuth with nonce:', nonce);
  res.redirect(authUrl);
});

// GoHighLevel OAuth callback
router.get('/gogo/callback', async (req, res) => {
  const { code, state, nonce, error, error_description } = req.query;

  console.log('[GHL Callback] Received callback:', {
    hasCode: !!code,
    hasState: !!state,
    hasNonce: !!nonce,
    error,
    error_description,
    queryKeys: Object.keys(req.query)
  });

  if (error) {
    console.error('[GHL Callback] OAuth Error:', error, error_description);
    const frontendUrl = getFrontendUrl();
    return res.redirect(`${frontendUrl}/settings?tab=integrations&status=error&provider=gohighlevel&message=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    let userId;
    // Use nonce from query (if GHL returned it) or from cookie (when GHL strips query params)
    const nonceToUse = nonce || getCookie(req, 'ghl_oauth_nonce');
    if (nonceToUse) {
      console.log('[GHL Callback] Attempting to retrieve userId using nonce (query or cookie):', nonceToUse ? 'present' : 'missing');
      const { data: stateData, error: stateFetchError } = await supabase
        .from('oauth_states')
        .select('user_id')
        .eq('nonce', nonceToUse)
        .eq('provider', 'gohighlevel')
        .single();

      if (stateData) {
        userId = stateData.user_id;
        console.log('[GHL Callback] Successfully retrieved userId from nonce:', userId);

        // Clean up the nonce
        supabase.from('oauth_states').delete().eq('nonce', nonceToUse).eq('provider', 'gohighlevel');
      } else {
        console.warn('[GHL Callback] No valid state found for nonce:', nonceToUse, stateFetchError?.message);
      }
    }

    // Fallback to state if nonce lookup failed or wasn't present
    if (!userId && state) {
      console.log('[GHL Callback] Falling back to state parameter');
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decodedState.userId;
      } catch (e) {
        console.error('[GHL Callback] Error decoding state:', e);
      }
    }

    // Final fallback: Use IP address if both nonce and state are missing (same normalization as at initiation)
    if (!userId) {
      const clientIp = getClientIp(req);
      console.log('[GHL Callback] No nonce or state found, attempting IP-based lookup for:', clientIp, '(raw:', req.ip, ')');
      const { data: ipStateData, error: ipFetchError } = await supabase
        .from('oauth_states')
        .select('user_id')
        .eq('ip_address', clientIp)
        .eq('provider', 'gohighlevel')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ipStateData) {
        userId = ipStateData.user_id;
        console.log('[GHL Callback] Successfully retrieved userId from IP lookup:', userId);
      } else {
        // Try raw req.ip in case DB has legacy value
        const { data: ipStateData2 } = await supabase
          .from('oauth_states')
          .select('user_id')
          .eq('ip_address', req.ip)
          .eq('provider', 'gohighlevel')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ipStateData2) {
          userId = ipStateData2.user_id;
          console.log('[GHL Callback] Retrieved userId from IP lookup (raw ip):', userId);
        } else {
          console.warn('[GHL Callback] IP-based lookup failed for:', clientIp, ipFetchError?.message);
        }
      }
    }

    if (!userId) {
      console.error('[GHL Callback] Missing userId (nonce, state, and IP lookup failed)');
      throw new Error('Authentication session expired or invalid. Please try again.');
    }

    const GHL_CLIENT_ID = process.env.GOHIGHLEVEL_CLIENT_ID || process.env.GOHIGHLEVEL_APP_ID;
    const GHL_CLIENT_SECRET = process.env.GOHIGHLEVEL_CLIENT_SECRET || process.env.GOHIGHLEVEL_APP_SECRET;
    const redirectUri = `${process.env.BACKEND_URL}/api/v1/connections/gogo/callback`;

    if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
      throw new Error('GoHighLevel credentials not configured');
    }

    // Exchange code for token
    const tokenRes = await fetch('https://services.gohighlevel.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GHL_CLIENT_ID,
        client_secret: GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        user_type: 'Location'
      })
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange code for token');
    }

    const { access_token, refresh_token, locationId, expires_in } = tokenData;

    // Get location info to use as label
    const locationRes = await fetch(`https://services.gohighlevel.com/locations/${locationId}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Version': '2021-07-28'
      }
    });
    const locationData = await locationRes.json();
    const locationName = locationData.location?.name || 'GHL Location';

    // Save to connections table
    const { data: connection, error: insertError } = await supabase
      .from('connections')
      .upsert({
        user_id: userId,
        provider: 'gohighlevel',
        label: `GoHighLevel: ${locationName}`,
        access_token: access_token,
        refresh_token: refresh_token,
        workspace_id: locationId, // Use locationId as workspace_id
        workspace_name: locationName,
        is_active: true,
        token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        metadata: {
          locationId,
          location: locationData.location,
          token_info: tokenData
        }
      }, {
        onConflict: 'connections_user_provider_workspace_unique',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('[GHL Callback] Error saving connection:', insertError);
      throw insertError;
    }

    // Register Webhook for Contact Created
    try {
      const webhookUrl = `${process.env.BACKEND_URL}/api/v1/webhooks/gohighlevel`;
      console.log(`[GHL Webhook] Registering webhook for location ${locationId}: ${webhookUrl}`);

      const webhookRes = await fetch('https://services.gohighlevel.com/webhooks/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify({
          url: webhookUrl,
          events: ['contact-created'],
          locationId: locationId
        })
      });

      const webhookData = await webhookRes.json();
      console.log('[GHL Webhook] Registration result:', webhookData);
    } catch (whError) {
      console.error('[GHL Webhook] Error registering webhook:', whError);
      // Don't fail the whole auth if webhook registration fails, but log it
    }

    console.log('[GHL Callback] Successfully saved GHL connection');
    const frontendUrl = getFrontendUrl();
    const redirectUrl = `${frontendUrl}/settings?tab=integrations&status=connected&provider=gohighlevel`;
    res.clearCookie('ghl_oauth_nonce', { path: '/' });
    res.redirect(redirectUrl);

  } catch (err) {
    console.error('[GHL Callback] Error:', err);
    const frontendUrl = getFrontendUrl();
    const errorRedirect = `${frontendUrl}/settings?tab=integrations&status=error&provider=gohighlevel&message=${encodeURIComponent(err.message)}`;
    res.clearCookie('ghl_oauth_nonce', { path: '/' });
    res.redirect(errorRedirect);
  }
});

// HubSpot OAuth initiation
router.get('/hubspot/auth', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send('userId is required');
  }

  const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || process.env.HUBSPOT_APP_ID;
  if (!HUBSPOT_CLIENT_ID) {
    console.error('[HubSpot Auth] HUBSPOT_CLIENT_ID is not configured');
    return res.status(500).send('HubSpot Client ID is not configured on the server.');
  }

  const scopes = 'crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write crm.objects.deals.read crm.objects.deals.write crm.objects.leads.read crm.objects.leads.write crm.objects.line_items.read crm.objects.products.read crm.objects.appointments.read crm.lists.read crm.lists.write tickets conversations.read oauth';
  const redirectUri = `${process.env.BACKEND_URL}/api/v1/connections/hubspot/callback`;

  // Note: HubSpot doesn't strictly require state but it's good practice. We can pass userId in state.
  // HubSpot state does not support base64 encoded JSON well sometimes if too long? 
  // But generally it's fine.
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${HUBSPOT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;

  console.log('[HubSpot Auth] Redirecting to HubSpot OAuth');
  res.redirect(authUrl);
});

// HubSpot OAuth callback
router.get('/hubspot/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // Decode state
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    if (!userId) {
      throw new Error('Missing userId in state');
    }

    const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || process.env.HUBSPOT_APP_ID;
    const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || process.env.HUBSPOT_APP_SECRET;
    const redirectUri = `${process.env.BACKEND_URL}/api/v1/connections/hubspot/callback`;

    if (!HUBSPOT_CLIENT_ID || !HUBSPOT_CLIENT_SECRET) {
      throw new Error('HubSpot credentials not configured');
    }

    // Exchange code for token
    const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code
      })
    });

    const tokenData = await tokenRes.json();

    if (tokenData.status === 'error' || !tokenData.access_token) {
      throw new Error(tokenData.message || 'Failed to exchange code for token');
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get hub info (portal info)
    // There isn't a direct "whoami" endpoint that returns portal name simply, 
    // but /account-info/v3/details might work or /integrations/v1/me (legacy) or /oauth/v1/access-tokens/{token}

    // We can use /oauth/v1/access-tokens/{token} to get token info which includes hub_id
    const infoRes = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${access_token}`);
    const infoData = await infoRes.json();

    if (infoRes.status !== 200) {
      throw new Error('Failed to fetch token info');
    }

    const hubId = infoData.hub_id;
    const hubDomain = infoData.hub_domain; // might be present

    // Save to connections table
    const { data: connection, error: insertError } = await supabase
      .from('connections')
      .upsert({
        user_id: userId,
        provider: 'hubspot',
        label: `HubSpot Portal: ${hubId}`,
        access_token: access_token,
        refresh_token: refresh_token,
        workspace_id: String(hubId),
        workspace_name: hubDomain || `HubSpot ${hubId}`,
        is_active: true,
        token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        metadata: {
          hubId,
          scopes: infoData.scopes,
          token_info: infoData
        }
      }, {
        onConflict: 'user_id,provider,workspace_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('[HubSpot Callback] Error saving connection:', insertError);
      throw insertError;
    }

    // Register Webhook (if possible via API)
    // HubSpot creates webhooks at the APP level, not the portal level, usually.
    // However, we can subscribe to events for this portal if we have the right scopes and app setup.
    // Unlike GHL, HubSpot webhooks are typically configured in the App Developer portal.
    // But we can check if we need to do anything dynamic. 
    // For now, we assume the App is already configured to send webhooks to our endpoint.
    // We just need to ensure we can map the incoming webhook (which has portalId) to this user.
    // Saving workspace_id as hubId handles that mapping.

    console.log('[HubSpot Callback] Successfully saved HubSpot connection');
    const frontendUrl = getFrontendUrl();
    const redirectUrl = `${frontendUrl}/settings?tab=integrations&status=connected&provider=hubspot`;
    res.redirect(redirectUrl);

  } catch (err) {
    console.error('[HubSpot Callback] Error:', err);
    const frontendUrl = getFrontendUrl();
    const errorRedirect = `${frontendUrl}/settings?tab=integrations&status=error&provider=hubspot&message=${encodeURIComponent(err.message)}`;
    res.redirect(errorRedirect);
  }
});


// Disconnect a connection
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[Connections] Error deleting connection:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Connections] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
