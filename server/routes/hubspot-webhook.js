import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { workflowService } from '../services/workflow-service.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to refresh HubSpot token
async function refreshHubSpotToken(connectionId, refreshToken) {
    const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || process.env.HUBSPOT_APP_ID;
    const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || process.env.HUBSPOT_APP_SECRET;

    if (!HUBSPOT_CLIENT_ID || !HUBSPOT_CLIENT_SECRET) {
        console.error('[HubSpot Refresh] Credentials not configured');
        return null;
    }

    try {
        const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: HUBSPOT_CLIENT_ID,
                client_secret: HUBSPOT_CLIENT_SECRET,
                refresh_token: refreshToken
            })
        });

        const data = await response.json();
        if (data.status === 'error' || !data.access_token) {
            console.error('[HubSpot Refresh] Failed:', data.message);
            return null;
        }

        // Update connection in database
        const { data: updated, error } = await supabase
            .from('connections')
            .update({
                access_token: data.access_token,
                refresh_token: data.refresh_token || refreshToken,
                token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
            })
            .eq('id', connectionId)
            .select()
            .single();

        if (error) {
            console.error('[HubSpot Refresh] Database update failed:', error);
            return data.access_token;
        }

        return updated.access_token;
    } catch (err) {
        console.error('[HubSpot Refresh] Error:', err);
        return null;
    }
}

// Helper to fetch contact details from HubSpot
async function getContactDetails(connection, contactId) {
    let accessToken = connection.access_token;

    // Check if token needs refresh (if expires in less than 5 minutes)
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    if (!expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
        console.log(`[HubSpot Webhook] Token expired or near expiry for connection ${connection.id}, refreshing...`);
        const newToken = await refreshHubSpotToken(connection.id, connection.refresh_token);
        if (newToken) accessToken = newToken;
    }

    try {
        // Properties to fetch
        const properties = ['email', 'firstname', 'lastname', 'phone', 'company', 'mobilephone'];
        const url = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=${properties.join(',')}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`[HubSpot Webhook] Failed to fetch contact ${contactId}: ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        return data.properties;
    } catch (err) {
        console.error('[HubSpot Webhook] Error fetching contact details:', err);
        return null;
    }
}

router.post('/', async (req, res) => {
    // specific to HubSpot: request body is an array of events
    const events = req.body;

    // HubSpot validation (optional but recommended for production)
    // const signature = req.headers['x-hubspot-signature'];

    if (!Array.isArray(events)) {
        return res.status(400).send('Invalid payload');
    }

    console.log(`[HubSpot Webhook] Received ${events.length} events`);

    // Group events by portalId to minimize DB lookups
    const eventsByPortal = {};
    for (const event of events) {
        if (!eventsByPortal[event.portalId]) {
            eventsByPortal[event.portalId] = [];
        }
        eventsByPortal[event.portalId].push(event);
    }

    // Process each portal's events
    for (const portalId of Object.keys(eventsByPortal)) {
        const portalEvents = eventsByPortal[portalId];

        // Find connection
        // Find active connection by HubSpot portal ID (workspace_id)
        const { data: connection, error: connError } = await supabase
            .from('connections')
            .select('*')
            .eq('provider', 'hubspot')
            .eq('workspace_id', String(portalId))
            .eq('is_active', true)
            .single();

        if (connError || !connection) {
            console.warn(`[HubSpot Webhook] No active connection found for portal ${portalId}`);
            continue;
        }

        for (const event of portalEvents) {
            console.log(`[HubSpot Webhook] Processing event ${event.subscriptionType} for user ${connection.user_id}`);

            // First pass: basic context info
            let context = {
                provider: 'hubspot',
                event: null, // will be mapped
                userId: connection.user_id,
                portalId: portalId,
                objectId: event.objectId,
                occurredAt: event.occurredAt,
                raw_event: event
            };

            let triggerType = null; // internal event mapping name

            // Map subscription types to friendly names
            // Normalize subscriptionType (e.g., 'contact.creation' -> 'contact_created' or 'contact_propertyChange' -> 'contact_property_change')
            let normalizedType = event.subscriptionType.replace('.', '_');

            // Map specific HubSpot types to our internal IDs
            if (normalizedType === 'contact_creation') {
                triggerType = 'hubspot_contact_created';
            } else if (normalizedType === 'contact_propertyChange') {
                // If the user wants a general "Updated" trigger, we can map this here too
                // For now, let's have both or map to property_change
                triggerType = 'hubspot_contact_property_change';
            } else if (normalizedType === 'company_creation') {
                triggerType = 'hubspot_company_created';
            } else if (normalizedType === 'company_propertyChange') {
                triggerType = 'hubspot_company_property_change';
            } else if (normalizedType === 'deal_creation') {
                triggerType = 'hubspot_deal_created';
            } else if (normalizedType === 'deal_propertyChange') {
                // Check if it's a stage update
                if (event.propertyName === 'dealstage') {
                    triggerType = 'hubspot_deal_stage_updated';
                } else {
                    triggerType = 'hubspot_deal_property_change';
                }
            } else if (normalizedType === 'ticket_creation') {
                triggerType = 'hubspot_ticket_created';
            } else if (normalizedType === 'ticket_propertyChange') {
                triggerType = 'hubspot_ticket_property_change';
            } else if (normalizedType === 'line_item_creation') {
                triggerType = 'hubspot_line_item_created';
            } else if (normalizedType === 'product_creation') {
                triggerType = 'hubspot_product_created';
            } else {
                triggerType = `hubspot_${normalizedType.toLowerCase()}`;
            }

            // Specific logic for fetching data if it's a contact event
            if (triggerType.startsWith('hubspot_contact_')) {
                // Fetch contact details
                const contactReq = await getContactDetails(connection, event.objectId);
                if (contactReq) {
                    context.name = `${contactReq.firstname || ''} ${contactReq.lastname || ''}`.trim();
                    context.email = contactReq.email || '';
                    context.phone = contactReq.phone || contactReq.mobilephone || '';
                    context.company = contactReq.company || '';
                    context.properties = contactReq;

                    // Also populate flattened fields that workflow might expect
                    context.contact_phone = context.phone;
                    context.contact_email = context.email;
                    context.contact_name = context.name;
                }
            }

            if (event.subscriptionType.includes('propertyChange')) {
                context.propertyName = event.propertyName;
                context.propertyValue = event.propertyValue;
            }

            // Set context event to the mapped trigger type
            context.event = triggerType;

            // Determine all applicable internal trigger types for this event
            const applicableTriggers = [triggerType];

            // Add "Recently Created or Updated" aliases
            if (triggerType === 'hubspot_contact_created' || triggerType === 'hubspot_contact_property_change') {
                applicableTriggers.push('hubspot_contact_updated');
            }
            if (triggerType === 'hubspot_company_created' || triggerType === 'hubspot_company_property_change') {
                applicableTriggers.push('hubspot_company_updated');
            }
            if (triggerType === 'hubspot_line_item_created' || triggerType === 'line_item_propertyChange') {
                applicableTriggers.push('hubspot_line_item_updated');
            }
            if (triggerType === 'hubspot_product_created' || triggerType === 'product_propertyChange') {
                applicableTriggers.push('hubspot_product_updated');
            }

            for (const tType of applicableTriggers) {
                console.log(`[HubSpot Webhook] Searching for workflows with trigger: ${tType} for user ${connection.user_id}`);

                // Find workflows
                // We search for active workflows. Check both status and is_active for backward compatibility.
                const { data: workflows, error: wfError } = await supabase
                    .from('workflows')
                    .select('*')
                    .eq('user_id', connection.user_id)
                    .or('status.eq.active,is_active.eq.true');

                if (wfError) {
                    console.error(`[HubSpot Webhook] Error fetching workflows:`, wfError);
                    continue;
                }

                if (workflows && workflows.length > 0) {
                    // Filter in memory to ensure accurate matching of trigger_type in nodes array
                    const matchingWorkflows = workflows.filter(wf => {
                        const nodes = wf.nodes || [];
                        return nodes.some(n => n.data?.trigger_type === tType);
                    });

                    if (matchingWorkflows.length > 0) {
                        for (const wf of matchingWorkflows) {
                            console.log(`[HubSpot Webhook] ✅ Executing workflow ${wf.id} (${wf.name})`);
                            // Update context event for this specific trigger match
                            const triggerContext = { ...context, event: tType };
                            workflowService.executeWorkflow(wf, triggerContext);
                        }
                    }
                }
            }
        }
    }

    res.status(200).send('OK');
});

export default router;
