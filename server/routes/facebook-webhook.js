import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { workflowService } from '../services/workflow-service.js';
import crypto from 'crypto';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;

function isValidSignature(signature, payload, secret) {
    const elements = signature.split('=');
    if (elements.length < 2) return false;
    const signatureHash = elements[1];
    const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    return signatureHash === expectedHash;
}

// Webhook Verification (GET)
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[Facebook Webhook] Verification request:', { mode, token: token ? '***' : 'missing' });

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('[Facebook Webhook] Verified successfully');
            res.status(200).send(challenge);
        } else {
            console.warn('[Facebook Webhook] Verification failed: Invalid token');
            res.sendStatus(403);
        }
    } else {
        console.warn('[Facebook Webhook] Verification failed: Missing mode or token');
        res.sendStatus(400);
    }
});

/**
 * Signature Verification Middleware
 * Now looks up the secret from the database based on the page_id
 */
async function verifySignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        console.warn('[Facebook Webhook] Missing signature');
        return res.sendStatus(401);
    }

    try {
        const body = req.body;
        // Peek into the body to find the page ID
        const pageId = body.entry?.[0]?.id;

        if (!pageId) {
            console.warn('[Facebook Webhook] Could not find page ID in payload');
            return res.sendStatus(400);
        }

        // Find the integration for this page
        const { data: integrations, error } = await supabase
            .from('facebook_integrations')
            .select('app_secret')
            .contains('pages', JSON.stringify([{ id: pageId }]))
            .limit(1);

        if (error || !integrations || integrations.length === 0) {
            console.warn(`[Facebook Webhook] No integration found for page ${pageId}`);
            // Fallback to env if nothing found (maybe it's a legacy or global app)
            const fallbackSecret = process.env.FACEBOOK_APP_SECRET;
            if (!fallbackSecret) return res.sendStatus(401);

            if (isValidSignature(signature, req.rawBody || JSON.stringify(req.body), fallbackSecret)) {
                return next();
            }
            return res.sendStatus(401);
        }

        const appSecret = integrations[0].app_secret;

        // Note: req.rawBody is needed for accurate HMAC verification if using express.json()
        // Our server/index.js might need to be updated to preserve rawBody
        const payload = req.rawBody || JSON.stringify(req.body);

        if (isValidSignature(signature, payload, appSecret)) {
            next();
        } else {
            console.warn('[Facebook Webhook] Invalid signature for page', pageId);
            res.sendStatus(401);
        }
    } catch (err) {
        console.error('[Facebook Webhook] Verification Error:', err);
        res.sendStatus(500);
    }
}



// Webhook Notification (POST)
router.post('/', verifySignature, async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.field === 'leadgen') {
                    const leadId = change.value.leadgen_id;
                    const pageId = change.value.page_id;
                    const formId = change.value.form_id;

                    console.log(`[Facebook Webhook] New lead received: ${leadId} from form ${formId}`);
                    // We don't await here to respond fast to FB
                    processLead(leadId, pageId, formId).catch(err => console.error('[Facebook Webhook] Process lead error:', err));
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

async function processLead(leadId, pageId, formId) {
    try {
        // 1. Find workflows search (check both status and is_active for backward compatibility)
        const { data: workflows, error: wfError } = await supabase
            .from('workflows')
            .select('*')
            .or('status.eq.active,is_active.eq.true');

        if (wfError) throw wfError;

        if (!workflows || workflows.length === 0) {
            console.log(`[Facebook Webhook] No active workflows found in database`);
            return;
        }

        // Filter in memory to find matching user and form_id
        const matchingWorkflows = workflows.filter(wf => {
            const nodes = wf.nodes || [];
            return nodes.some(n => n.data?.trigger_type === 'facebook_leads' && n.data?.form_id === formId);
        });

        if (matchingWorkflows.length === 0) {
            console.log(`[Facebook Webhook] No active workflows found for form ${formId}`);
            return;
        }

        const firstMatchingWorkflow = matchingWorkflows[0];
        console.log(`[Facebook Webhook] Found ${matchingWorkflows.length} matching workflows`);

        // 2. Fetch lead info from Facebook
        // Find the specific integration that contains this page
        const { data: fbIntegration } = await supabase
            .from('facebook_integrations')
            .select('*')
            .eq('user_id', firstMatchingWorkflow.user_id)
            .contains('pages', JSON.stringify([{ id: pageId }]))
            .single();

        if (!fbIntegration) throw new Error(`Facebook integration not found for page ${pageId}`);

        // Get page access token from integration's stored pages if available, else fetch
        let pageAccessToken = fbIntegration.pages?.find(p => p.id === pageId)?.access_token;

        if (!pageAccessToken) {
            const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${fbIntegration.access_token}`);
            const pagesData = await pagesRes.json();
            const page = pagesData.data?.find(p => p.id === pageId);
            if (!page) throw new Error('Page access token not found');
            pageAccessToken = page.access_token;
        }

        const leadRes = await fetch(`https://graph.facebook.com/v18.0/${leadId}?access_token=${pageAccessToken}`);
        const leadData = await leadRes.json();

        if (leadData.error) throw new Error(leadData.error.message);

        // 3. Map lead data to context
        const context = {
            lead_id: leadId,
            facebook_form_id: formId,
            facebook_page_id: pageId,
            facebook_page_name: fbIntegration.pages?.find(p => p.id === pageId)?.name,
            created_at: leadData.created_time,
            raw_lead_data: leadData
        };

        leadData.field_data?.forEach(field => {
            context[field.name] = field.values[0];
        });

        // 4. Trigger workflows
        for (const wf of matchingWorkflows) {
            console.log(`[Facebook Webhook] ✅ Executing workflow ${wf.id} for lead ${leadId}`);
            workflowService.executeWorkflow(wf, context);
        }
    } catch (err) {
        console.error('[Facebook Webhook] Process lead error details:', err);
    }
}


export default router;
