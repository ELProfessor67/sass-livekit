import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FB_APP_ID = process.env.FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = `${process.env.BACKEND_URL}/api/v1/integrations/facebook/callback`;

// Initiate Facebook OAuth
router.get('/auth', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).send('userId is required');

    if (!FB_APP_ID) {
        console.error('[Facebook Auth] FACEBOOK_APP_ID is not configured');
        return res.status(500).send('Facebook App ID is not configured on the server.');
    }

    const scopes = [
        'pages_show_list',
        'leads_retrieval',
        'ads_management',
        'public_profile',
        'email'
    ];

    const state = Buffer.from(JSON.stringify({
        userId,
        appId: FB_APP_ID,
        appSecret: FB_APP_SECRET
    })).toString('base64');

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${scopes.join(',')}`;

    console.log('[Facebook Auth] Redirecting for Lead Ads automation:', FB_APP_ID);
    res.redirect(authUrl);
});

// List connected Facebook accounts
router.get('/accounts', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).send('userId is required');

    try {
        const { data: integrations, error } = await supabase
            .from('facebook_integrations')
            .select('facebook_user_id, updated_at')
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ accounts: integrations });
    } catch (err) {
        console.error('[Facebook Accounts] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Facebook OAuth Callback
router.get('/callback', async (req, res) => {
    const { code, state: stateData } = req.query;

    if (!code) return res.status(400).send('No code provided');

    try {
        // Decode state
        const { userId, appId, appSecret } = JSON.parse(Buffer.from(stateData, 'base64').toString());

        if (!appId || !appSecret) throw new Error('Missing credentials in state');

        // Exchange code for short-lived access token
        const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${appSecret}&code=${code}`);
        const tokenData = await tokenRes.json();

        if (tokenData.error) throw new Error(tokenData.error.message);

        let accessToken = tokenData.access_token;

        // Exchange short-lived token for a long-lived token (60 days)
        try {
            const longLivedRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`);
            const longLivedData = await longLivedRes.json();
            if (longLivedData.access_token) {
                accessToken = longLivedData.access_token;
                console.log('[Facebook Auth] Successfully exchanged for long-lived token');
            }
        } catch (llError) {
            console.error('[Facebook Auth] Error exchanging for long-lived token:', llError);
            // Continue with short-lived token if exchange fails
        }

        // Get user info
        const userRes = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
        const userData = await userRes.json();

        // Save to database
        const { error } = await supabase
            .from('facebook_integrations')
            .upsert({
                user_id: userId,
                facebook_user_id: userData.id,
                access_token: accessToken,
                app_id: appId,
                app_secret: appSecret,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, facebook_user_id' });

        if (error) throw error;

        // Redirect back to frontend
        res.redirect(`${process.env.FRONTEND_URL}/integrations?status=success&platform=facebook`);
    } catch (err) {
        console.error('[Facebook Auth] Error:', err);
        res.redirect(`${process.env.FRONTEND_URL}/integrations?status=error&platform=facebook`);
    }
});

// Fetch Pages and Lead Forms
router.get('/lead-forms', async (req, res) => {
    const { userId, facebookUserId } = req.query;

    try {
        let query = supabase
            .from('facebook_integrations')
            .select('*')
            .eq('user_id', userId);

        if (facebookUserId) {
            query = query.eq('facebook_user_id', facebookUserId);
        }

        const { data: integrations, error: dbError } = await query;

        if (dbError || !integrations || integrations.length === 0) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        const integration = integrations[0]; // Use the specific one or first one

        // Get Pages
        const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${integration.access_token}`);
        const pagesData = await pagesRes.json();

        if (pagesData.error) throw new Error(pagesData.error.message);

        const pages = pagesData.data;
        const allForms = [];

        // For each page, get lead forms
        for (const page of pages) {
            const formsRes = await fetch(`https://graph.facebook.com/v18.0/${page.id}/leadgen_forms?access_token=${page.access_token}`);
            const formsData = await formsRes.json();
            if (formsData.data) {
                allForms.push(...formsData.data.map(f => ({ ...f, page_id: page.id, page_name: page.name })));
            }
        }

        // Cache pages and forms in DB for the webhook to use
        await supabase
            .from('facebook_integrations')
            .update({
                pages: pages.map(p => ({ id: p.id, name: p.name, access_token: p.access_token })),
                lead_forms: allForms,
                updated_at: new Date().toISOString()
            })
            .eq('id', integration.id);

        res.json({ forms: allForms, pages: pages });
    } catch (err) {
        console.error('[Facebook Leads] Error fetching forms:', err);
        res.status(500).json({ error: err.message });
    }
});

// Fetch a test lead for a form
router.get('/test-lead', async (req, res) => {
    const { userId, facebookUserId, formId } = req.query;

    try {
        let query = supabase
            .from('facebook_integrations')
            .select('*')
            .eq('user_id', userId);

        if (facebookUserId) {
            query = query.eq('facebook_user_id', facebookUserId);
        }

        const { data: integrations } = await query;

        if (!integrations || integrations.length === 0) return res.status(404).json({ error: 'Integration not found' });

        const integration = integrations[0];

        // Find the page ID for this form from cached lead_forms
        const form = integration.lead_forms?.find(f => f.id === formId);
        if (!form) return res.status(404).json({ error: 'Form not found in integration' });

        const page = integration.pages?.find(p => p.id === form.page_id);
        if (!page) return res.status(404).json({ error: 'Page token not found' });

        // Fetch last lead
        const leadRes = await fetch(`https://graph.facebook.com/v18.0/${formId}/leads?limit=1&access_token=${page.access_token}`);
        const leadData = await leadRes.json();

        if (leadData.error) throw new Error(leadData.error.message);

        res.json({ lead: leadData.data?.[0] || null });
    } catch (err) {
        console.error('[Facebook Leads] Error fetching test lead:', err);
        res.status(500).json({ error: err.message });
    }
});

// Subscribe a page to webhooks
router.post('/subscribe', async (req, res) => {
    const { userId, facebookUserId, pageId } = req.body;

    try {
        let query = supabase
            .from('facebook_integrations')
            .select('*')
            .eq('user_id', userId);

        if (facebookUserId) {
            query = query.eq('facebook_user_id', facebookUserId);
        }

        const { data: integrations } = await query;

        if (!integrations || integrations.length === 0) return res.status(404).json({ error: 'Integration not found' });

        const integration = integrations[0];

        const page = integration.pages?.find(p => p.id === pageId);
        if (!page) return res.status(404).json({ error: 'Page not found' });

        // Subscribe application to page's leadgen field
        const subRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${page.access_token}`, {
            method: 'POST'
        });
        const subData = await subRes.json();

        if (subData.error) throw new Error(subData.error.message);

        // Update subscriptions in DB
        const subscriptions = integration.subscriptions || [];
        if (!subscriptions.includes(pageId)) {
            subscriptions.push(pageId);
            await supabase
                .from('facebook_integrations')
                .update({ subscriptions })
                .eq('id', integration.id);
        }

        res.json({ success: true, data: subData });
    } catch (err) {
        console.error('[Facebook Leads] Error subscribing page:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;

