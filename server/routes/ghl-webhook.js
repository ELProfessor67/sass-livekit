import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { workflowService } from '../services/workflow-service.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/v1/webhooks/gohighlevel
 * Handles contact created events from GoHighLevel
 */
router.post('/', async (req, res) => {
    const payload = req.body;
    const { type, locationId, contact_id } = payload;

    console.log(`[GHL Webhook] Received event: ${type} for location: ${locationId}`);

    // HighLevel sends a few event types, we specifically care about contact-created
    // Note: The event type in the payload might be 'contact-created' or 'ContactCreated' depending on API version
    if (type === 'contact-created' || type === 'ContactCreated' || payload.event === 'contact_created') {
        try {
            // 1. Find the connection to get the userId and connection details
            const { data: connection, error: connError } = await supabase
                .from('connections')
                .select('*')
                .eq('provider', 'gohighlevel')
                .eq('workspace_id', locationId)
                .eq('is_active', true)
                .single();

            if (connError || !connection) {
                console.warn(`[GHL Webhook] No active connection found for location ${locationId}`);
                return res.status(200).send('No connection found');
            }

            // 2. Fetch full contact data if needed (optional, GHL payload usually contains basic info)
            // For now, we'll use the data provided in the webhook payload
            const contactData = payload.contact || payload;

            // 3. Map GHL data to workflow context
            const context = {
                provider: 'gohighlevel',
                event: 'ghl_contact_created',
                userId: connection.user_id,
                locationId: locationId,
                contact_id: contactData.id || contact_id,
                name: `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || contactData.name || 'Unknown',
                email: contactData.email || '',
                phone: contactData.phone || '',
                // Also populate flattened fields that UI documentation expects
                contact_name: `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || contactData.name || 'Unknown',
                contact_email: contactData.email || '',
                contact_phone: contactData.phone || '',
                raw_data: payload
            };

            console.log(`[GHL Webhook] Triggering workflows for user ${connection.user_id}, event: ghl_contact_created`);

            // 4. Find and execute workflows
            // We search for active workflows. Check both status and is_active for backward compatibility.
            const { data: workflows, error: wfError } = await supabase
                .from('workflows')
                .select('*')
                .eq('user_id', connection.user_id)
                .or('status.eq.active,is_active.eq.true');

            if (wfError) throw wfError;

            if (workflows && workflows.length > 0) {
                // Filter in memory to ensure accurate matching of trigger_type in nodes array
                const triggerType = 'ghl_contact_created';
                const matchingWorkflows = workflows.filter(wf => {
                    const nodes = wf.nodes || [];
                    return nodes.some(n => n.data?.trigger_type === triggerType);
                });

                if (matchingWorkflows.length > 0) {
                    for (const wf of matchingWorkflows) {
                        console.log(`[GHL Webhook] ✅ Executing workflow ${wf.id} (${wf.name})`);
                        workflowService.executeWorkflow(wf, context);
                    }
                } else {
                    console.log(`[GHL Webhook] No active workflows found for ghl_contact_created for user ${connection.user_id}`);
                }
            } else {
                console.log(`[GHL Webhook] No active workflows found for user ${connection.user_id}`);
            }

            res.status(200).send('OK');
        } catch (err) {
            console.error('[GHL Webhook] Error processing event:', err);
            res.status(500).send('Internal Server Error');
        }
    } else {
        console.log(`[GHL Webhook] Skipping unhandled event type: ${type}`);
        res.status(200).send('Event not handled');
    }
});

/**
 * GET /api/v1/webhooks/gohighlevel
 * For GHL webhook verification if needed
 */
router.get('/', (req, res) => {
    res.status(200).send('GHL Webhook endpoint active');
});

export default router;
