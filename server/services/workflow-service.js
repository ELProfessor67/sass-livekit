// server/services/workflow-service.js
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const UNIVERSAL_EXTRACTION_SCHEMA = {
    name: "The contact's full name",
    summary: "Brief overview of the call conversation",
    outcome: "The final result or disposition of the call (e.g., appointment_booked, lead_qualified, follow_up_needed, no_interest)",
    email: "Extract the contact's email address if mentioned",
    phone: "Extract any callback or contact phone number mentioned",
    address: "Extract any physical address mentioned",
    company: "Extract the company name if mentioned",
    notes: "Any additional notes or contact preferences",
    sentiment: "Overall tone of the caller (positive, neutral, negative, frustrated)",
    urgent: "Boolean: true if the matter requires immediate attention, false otherwise",
    appointment: {
        status: "Booking status: 'booked' or 'not_booked'",
        start_time: "Appointment start time in ISO format (or descriptive like 'Tomorrow at 2pm')",

        timezone: "Timezone for the appointment",


        contact: {
            name: "Name of the person who booked (often same as caller)",
            email: "Email of the person who booked",
            phone: "Phone number of the person who booked"
        }
    }
};

class WorkflowService {
    /**
     * Trigger workflows for a specific event
     * @param {string} userId 
     * @param {string} assistantId 
     * @param {string} event 
     * @param {Object} callData 
     */
    async triggerWorkflows(userId, assistantId, event, callData) {
        try {
            console.log(`[WorkflowService] Triggering workflows for user ${userId}, assistant ${assistantId}, event ${event}`);

            let enhancedCallData = { ...callData };

            // For call_ended events, perform universal AI extraction
            if (event === 'call_ended' && (callData?.transcript || callData?.transcription)) {
                console.log(`[WorkflowService] Call ended detected, performing universal AI extraction...`);
                // Gather transcript
                let transcript = callData.transcript;
                if (!transcript && callData.transcription) {
                    if (Array.isArray(callData.transcription)) {
                        transcript = callData.transcription.map(t => `${t.role}: ${t.content}`).join('\n');
                    } else {
                        transcript = callData.transcription;
                    }
                }

                if (transcript && transcript.length > 5) {
                    const extractedData = await this.extractAllVariablesFromTranscription(transcript, enhancedCallData);
                    if (extractedData) {
                        console.log(`[WorkflowService] Successfully extracted ${Object.keys(extractedData).length} variables`);
                        // Merge extracted data into structured_data and top level
                        enhancedCallData.structured_data = {
                            ...(enhancedCallData.structured_data || {}),
                            ...extractedData
                        };
                        // Also put at top level for easy access
                        enhancedCallData = {
                            ...enhancedCallData,
                            ...extractedData
                        };
                    }
                }
            }

            // 1. Fetch active workflows linked to this assistant from both sources
            // Source A: Junction table (many-to-many)
            const { data: junctionWorkflows, error: junctionError } = await supabase
                .from('assistant_workflows')
                .select(`
                  workflow_id,
                  workflow:workflows!workflow_id(*)
                `)
                .eq('assistant_id', assistantId);

            // Source B: Direct reference in workflows table (assigned in workflow config)
            const { data: directWorkflows, error: directError } = await supabase
                .from('workflows')
                .select('*')
                .eq('assistant_id', assistantId)
                .or('status.eq.active,is_active.eq.true');

            if (junctionError) {
                console.error('[WorkflowService] Error fetching junction workflows:', junctionError);
            }
            if (directError) {
                console.error('[WorkflowService] Error fetching direct workflows:', directError);
            }

            // 2. Combine and deduplicate workflows
            const workflowsToExecute = new Map();

            // Process junction workflows (only if active)
            if (junctionWorkflows) {
                for (const entry of junctionWorkflows) {
                    const workflow = entry.workflow;
                    // Check both is_active and status for activity
                    const isActive = workflow && (workflow.is_active === true || workflow.status === 'active');
                    if (isActive) {
                        workflowsToExecute.set(workflow.id, workflow);
                    }
                }
            }

            // Process direct workflows (already filtered by is_active in query)
            if (directWorkflows) {
                for (const workflow of directWorkflows) {
                    if (!workflowsToExecute.has(workflow.id)) {
                        workflowsToExecute.set(workflow.id, workflow);
                    }
                }
            }

            if (workflowsToExecute.size === 0) {
                console.log('[WorkflowService] No active workflows linked to assistant');
                return;
            }

            // 3. Start execution for each unique workflow
            for (const workflow of workflowsToExecute.values()) {
                // Pass full context including the event
                // Extract outcome from various possible locations
                const outcome = enhancedCallData?.outcome || enhancedCallData?.call_outcome || null;
                const context = {
                    event,
                    userId,
                    assistantId,
                    ...enhancedCallData,
                    // Explicitly set outcome at top level for condition node evaluation
                    outcome: outcome
                };

                console.log(`[WorkflowService] Executing workflow ${workflow.id} (${workflow.name}) with event ${event}`);

                this.executeWorkflow(workflow, context);
            }
        } catch (err) {
            console.error('[WorkflowService] Trigger failed:', err);
        }
    }

    /**
     * Extract all possible variables from call transcription using OpenAI
     */
    async extractAllVariablesFromTranscription(transcript, metadata = {}) {
        try {
            console.log('[WorkflowService] Calling OpenAI for universal extraction...');

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are an expert data extractor. Your task is to extract all available information from the provided call transcript and metadata.
                        
                        Return a JSON object matching this schema:
                        ${JSON.stringify(UNIVERSAL_EXTRACTION_SCHEMA, null, 2)}
                        
                        Rules:
                        1. Only include fields where you find clear information.
                        2. If a field is not mentioned, omit it or set to null.
                        3. For 'outcome', synthesize the final result of the call.
                        4. For 'sentiment', use one of: positive, neutral, negative, frustrated.
                        5. For 'urgent', return a boolean.
                        6. For 'appointment.status', use 'booked' if a specific time was agreed upon, otherwise 'not_booked'.
                        
                        Transcript follows below.`
                    },
                    {
                        role: "user",
                        content: `Metadata: ${JSON.stringify(metadata)}\n\nTranscript:\n${transcript}`
                    }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            const extractedData = JSON.parse(content);
            console.log(`[WorkflowService] Successfully extracted variables:`, Object.keys(extractedData));
            return extractedData;
        } catch (err) {
            console.error('[WorkflowService] Extraction failed:', err);
            return null;
        }
    }

    /**
     * Convert router nodes to condition nodes + edges for execution
     * This is a UI convenience - router nodes are internally converted to condition nodes
     */
    convertRouterNodesToConditions(workflow) {
        const nodes = [...(workflow.nodes || [])];
        const edges = [...(workflow.edges || [])];

        // Find all router nodes
        const routerNodes = nodes.filter(n => n.type === 'router');

        for (const routerNode of routerNodes) {
            const branches = routerNode.data?.branches || [];
            if (branches.length === 0) continue;

            // Find incoming edges to this router node
            const incomingEdges = edges.filter(e => e.target === routerNode.id);

            // Find outgoing edges from this router node (may have sourceHandle indicating branch)
            const outgoingEdges = edges.filter(e => e.source === routerNode.id);

            // For each branch, create a condition node
            const conditionNodes = branches.map((branch, idx) => {
                const conditionNodeId = `${routerNode.id}_condition_${idx}`;
                return {
                    id: conditionNodeId,
                    type: 'condition',
                    position: {
                        x: routerNode.position.x + (idx * 200),
                        y: routerNode.position.y
                    },
                    data: {
                        ...routerNode.data,
                        label: branch.label || `Branch ${idx + 1}`,
                        conditions: [{
                            variable: branch.condition?.variable || '{outcome}',
                            operator: branch.condition?.operator || 'contains',
                            value: branch.condition?.value || ''
                        }],
                        logic: 'AND'
                    }
                };
            });

            // Add condition nodes
            nodes.push(...conditionNodes);

            // Activepieces-style: Router evaluates branches in order, first match wins
            // Create a sequential chain: incoming -> condition1 -> condition2 -> condition3...
            // Each condition only proceeds if previous conditions didn't match

            // Connect incoming edges to first condition node
            for (const incomingEdge of incomingEdges) {
                if (conditionNodes.length > 0) {
                    edges.push({
                        id: `${incomingEdge.source}_${conditionNodes[0].id}`,
                        source: incomingEdge.source,
                        target: conditionNodes[0].id,
                        type: incomingEdge.type || 'smart',
                        data: {
                            condition: 'always'
                        }
                    });
                }
            }

            // Chain condition nodes: if condition1 fails, go to condition2, etc.
            for (let idx = 0; idx < conditionNodes.length; idx++) {
                const conditionNode = conditionNodes[idx];
                const branchHandleId = `branch-${idx}`;

                // Find edges from this specific branch
                const branchEdges = outgoingEdges.filter(e =>
                    e.sourceHandle === branchHandleId ||
                    e.sourceHandle === `branch-${branches[idx]?.id || idx}`
                );

                // TRUE path: when condition matches, route to branch's target nodes
                for (const outgoingEdge of branchEdges) {
                    edges.push({
                        id: `${conditionNode.id}_true_${outgoingEdge.target}`,
                        source: conditionNode.id,
                        target: outgoingEdge.target,
                        type: outgoingEdge.type || 'smart',
                        data: {
                            condition: 'router_true' // Special marker for router true path
                        }
                    });
                }

                // FALSE path: when condition doesn't match, go to next condition node
                if (idx < conditionNodes.length - 1) {
                    const nextConditionNode = conditionNodes[idx + 1];
                    edges.push({
                        id: `${conditionNode.id}_false_${nextConditionNode.id}`,
                        source: conditionNode.id,
                        target: nextConditionNode.id,
                        type: 'smart',
                        data: {
                            condition: 'router_false' // Special marker for router false path
                        }
                    });
                }
            }

            // Remove router node and its edges
            const routerIndex = nodes.findIndex(n => n.id === routerNode.id);
            if (routerIndex !== -1) {
                nodes.splice(routerIndex, 1);
            }

            // Remove old router edges
            const routerEdgeIds = new Set([
                ...incomingEdges.map(e => e.id),
                ...outgoingEdges.map(e => e.id)
            ]);

            for (let i = edges.length - 1; i >= 0; i--) {
                if (routerEdgeIds.has(edges[i].id)) {
                    edges.splice(i, 1);
                }
            }
        }

        return {
            ...workflow,
            nodes,
            edges
        };
    }

    /**
     * Root execution method for a workflow
     */
    async executeWorkflow(workflow, context, startNodeId = null) {
        // SAFETY CHECK: Only trigger if workflow is active
        const isActive = workflow && (workflow.is_active === true || workflow.status === 'active');
        if (!isActive) {
            console.log(`[WorkflowService] Skipping execution of workflow ${workflow?.id} (${workflow?.name}): Workflow is not active.`);
            return;
        }

        // Convert router nodes to condition nodes before execution
        const convertedWorkflow = this.convertRouterNodesToConditions(workflow);
        const nodes = convertedWorkflow.nodes || [];
        const edges = convertedWorkflow.edges || [];

        // Find trigger node if no startNodeId provided
        let currentNodeId = startNodeId;
        if (!currentNodeId) {
            const event = context.event;
            const triggerNode = nodes.find(n => {
                const nodeEvent = n.data?.event;

                // If it's a legacy post_call node, it only triggers on call_ended
                if (n.type === 'post_call') {
                    return event === 'call_ended';
                }

                // For trigger nodes:
                if (n.type === 'trigger') {
                    // 1. Explicit match on event
                    if (nodeEvent === event) return true;

                    // 2. Match on trigger_type (used for GHL, Facebook, etc.)
                    if (n.data?.trigger_type === event) return true;

                    // 3. Special mapping: 'webhook' trigger type matches 'call_ended' event
                    if (n.data?.trigger_type === 'webhook' && event === 'call_ended') return true;

                    // 4. Legacy fallback: if no event is defined on the node, treat it as call_ended
                    if (!nodeEvent && !n.data?.trigger_type && event === 'call_ended') return true;
                }

                return false;
            });

            if (!triggerNode) {
                console.log(`[WorkflowService] Workflow ${workflow.id} skip: No trigger for event "${event}". (Node events: ${nodes.filter(n => n.type === 'trigger').map(n => n.data?.event || 'undefined').join(', ')})`);
                return;
            }
            currentNodeId = triggerNode.id;
        }

        await this.processNode(currentNodeId, nodes, edges, context, workflow);
    }

    /**
     * Process a single node and its downstream branches
     */
    async processNode(nodeId, nodes, edges, context, workflow) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        console.log(`[WorkflowService] Processing node ${nodeId} (${node.type})`);

        // Execute node logic
        let shouldContinue = true;
        try {
            if (node.type === 'twilio_sms') {
                await this.handleSmsNode(node, context, workflow);
            } else if (node.type === 'webhook') {
                await this.handleWebhookNode(node, context);
            } else if (node.type === 'condition') {
                shouldContinue = this.handleConditionNode(node, context);
            } else if (node.type === 'action' && node.data?.integration === 'Slack') {
                await this.handleSlackNode(node, context, workflow);
            } else if (node.type === 'action' && node.data?.integration === 'HubSpot') {
                await this.handleHubspotNode(node, context, workflow);
            } else if (node.type === 'action' && node.data?.integration === 'HTTP Request') {
                await this.handleHttpRequestNode(node, context);
            } else if (node.type === 'call_lead') {
                await this.handleCallLeadNode(node, context, workflow);
            }
        } catch (err) {
            console.error(`[WorkflowService] Node ${nodeId} execution failed:`, err);
            // We might want to stop this branch on failure
            return;
        }

        // For condition nodes in router context, handle TRUE/FALSE paths differently
        if (node.type === 'condition') {
            const downstreamEdges = edges.filter(e => e.source === nodeId);

            if (shouldContinue) {
                // Condition matched: take TRUE path (router_true edges)
                const trueEdges = downstreamEdges.filter(e => e.data?.condition === 'router_true');
                if (trueEdges.length > 0) {
                    // Route to branch target nodes
                    for (const edge of trueEdges) {
                        if (this.evaluateEdgeCondition(edge, context)) {
                            await this.processNode(edge.target, nodes, edges, context, workflow);
                        }
                    }
                } else {
                    // No router_true edges, use all edges (backward compatibility)
                    for (const edge of downstreamEdges) {
                        if (this.evaluateEdgeCondition(edge, context)) {
                            await this.processNode(edge.target, nodes, edges, context, workflow);
                        }
                    }
                }
            } else {
                // Condition didn't match: take FALSE path (router_false edges) to next condition
                const falseEdges = downstreamEdges.filter(e => e.data?.condition === 'router_false');
                for (const edge of falseEdges) {
                    if (this.evaluateEdgeCondition(edge, context)) {
                        await this.processNode(edge.target, nodes, edges, context, workflow);
                    }
                }
                // If no router_false edges, stop (last branch or non-router condition)
            }
            return;
        }

        // For non-condition nodes, proceed normally
        // Find downstream edges
        const downstreamEdges = edges.filter(e => e.source === nodeId);
        for (const edge of downstreamEdges) {
            if (this.evaluateEdgeCondition(edge, context)) {
                await this.processNode(edge.target, nodes, edges, context, workflow);
            }
        }
    }

    /**
     * SMS Node Handler
     */
    async handleSmsNode(node, context, workflow) {
        const { to_number, message } = node.data || {};
        const flatContext = this.flattenContext(context);

        // Debug: Log all available variables in a readable format (only show variables with actual values)
        console.log('\n========== WORKFLOW VARIABLES AVAILABLE ==========');
        console.log('📋 All available variables for interpolation:');
        const sortedKeys = Object.keys(flatContext).sort();
        let hasVariables = false;
        for (const key of sortedKeys) {
            const value = flatContext[key];
            // Skip empty, null, undefined, or whitespace-only values
            if (value === null || value === undefined || value === '') {
                continue;
            }
            // Skip empty arrays
            if (Array.isArray(value) && value.length === 0) {
                continue;
            }
            // Skip empty objects (but not arrays, Date, etc.)
            if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object && Object.keys(value).length === 0) {
                continue;
            }
            // Skip whitespace-only strings
            if (typeof value === 'string' && value.trim() === '') {
                continue;
            }
            hasVariables = true;
            const displayValue = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value).substring(0, 100);
            console.log(`  {${key}} = ${displayValue}`);
        }
        if (!hasVariables) {
            console.log('  (no variables with values available)');
        }

        // Only show appointment data if it has meaningful values
        const appointment = context.appointment || context.callData?.appointment;
        if (appointment) {
            const hasAppointmentData = appointment.status ||
                appointment.start_time ||
                appointment.booking_link ||
                appointment.contact?.name ||
                appointment.contact?.email ||
                appointment.contact?.phone;
            if (hasAppointmentData) {
                console.log('\n📅 Appointment data:');
                if (appointment.status) console.log('  {appointment.status} =', appointment.status);
                if (appointment.contact?.name) console.log('  {appointment.contact.name} =', appointment.contact.name);
                if (appointment.contact?.email) console.log('  {appointment.contact.email} =', appointment.contact.email);
                if (appointment.contact?.phone) console.log('  {appointment.contact.phone} =', appointment.contact.phone);
                if (appointment.start_time) console.log('  {appointment.start_time} =', appointment.start_time);
                if (appointment.booking_link) console.log('  {appointment.booking_link} =', appointment.booking_link);
            }
        }

        // Only show common aliases if they have values
        const hasAliases = flatContext.name || flatContext.email || flatContext.phone || flatContext.booking_status;
        if (hasAliases) {
            console.log('\n👤 Common aliases:');
            if (flatContext.name) console.log('  {name} =', flatContext.name);
            if (flatContext.email) console.log('  {email} =', flatContext.email);
            if (flatContext.phone) console.log('  {phone} =', flatContext.phone);
            if (flatContext.booking_status && flatContext.booking_status !== 'not_booked') {
                console.log('  {booking_status} =', flatContext.booking_status);
            }
        }
        console.log('================================================\n');

        // Interpolate with both flattened (for backward compatibility) and original context (for dot notation)
        const rawTargetNumber = to_number || '{phone_number}';
        let targetNumber = this.interpolate(rawTargetNumber, flatContext, context);
        let body = this.interpolate(message || '', flatContext, context);

        console.log(`[WorkflowService] Target Number - Raw: ${rawTargetNumber}, Interpolated: ${targetNumber}`);
        // Debug: Log the interpolated message
        console.log('[WorkflowService] Interpolated SMS body:', body);

        if (!targetNumber || targetNumber === '{phone_number}' || targetNumber === rawTargetNumber && rawTargetNumber.includes('{')) {
            console.warn(`[WorkflowService] SMS skipped: No target number found in context. (Target: ${targetNumber})`);
            return;
        }

        console.log(`[WorkflowService] Sending SMS to ${targetNumber} (Node: ${node.id})`);

        // Fetch user Twilio credentials
        const { data: credentials, error: credError } = await supabase
            .from('user_twilio_credentials')
            .select('*')
            .eq('user_id', workflow.user_id)
            .eq('is_active', true)
            .single();

        if (credError || !credentials) {
            console.error('[WorkflowService] Twilio credentials missing for user:', workflow.user_id);
            throw new Error('No Twilio credentials found');
        }

        const client = twilio(credentials.account_sid, credentials.auth_token);

        // Determine from number
        let fromNumber = flatContext.agent_phone_number || credentials.phone_number || process.env.TWILIO_PHONE_NUMBER;

        // If workflow has an assistant_id, use the phone number associated with that assistant
        if (workflow.assistant_id) {
            console.log(`[WorkflowService] Workflow has assistant assigned: ${workflow.assistant_id}. Searching for its phone number...`);
            const { data: assistantPhone, error: phoneError } = await supabase
                .from('phone_number')
                .select('number, status, inbound_assistant_id')
                .eq('inbound_assistant_id', workflow.assistant_id)
                .eq('status', 'active')
                .maybeSingle();

            if (phoneError) {
                console.error(`[WorkflowService] Error switching to assistant phone number:`, phoneError);
            } else if (assistantPhone?.number) {
                console.log(`[WorkflowService] ✅ Using workflow assistant phone number: ${assistantPhone.number}`);
                fromNumber = assistantPhone.number;
            } else {
                console.log(`[WorkflowService] ⚠️ No active phone number found for assistant ${workflow.assistant_id}`);

                // Fallback: check if ANY phone number exists for this assistant regardless of status for debugging
                const { data: allPhone } = await supabase
                    .from('phone_number')
                    .select('number, status')
                    .eq('inbound_assistant_id', workflow.assistant_id)
                    .limit(1);

                if (allPhone && allPhone.length > 0) {
                    console.log(`[WorkflowService] Info: Found a phone number for this assistant but it's ${allPhone[0].status}: ${allPhone[0].number}`);
                }
            }
        } else {
            console.log(`[WorkflowService] No assistant assigned at workflow level.`);
        }

        // If still no fromNumber, try to fetch from phone_number table
        if (!fromNumber) {
            const { data: phoneNumbers } = await supabase
                .from('phone_number')
                .select('number')
                .eq('user_id', workflow.user_id)
                .eq('status', 'active')
                .limit(1);

            if (phoneNumbers && phoneNumbers.length > 0) {
                fromNumber = phoneNumbers[0].number;
            }
        }

        if (!fromNumber) {
            console.error('[WorkflowService] SMS failed: No sender (from) number available');
            throw new Error('No sender phone number available');
        }

        try {
            const msgResponse = await client.messages.create({
                to: targetNumber,
                from: fromNumber,
                body: body
            });
            console.log(`[WorkflowService] SMS sent successfully: ${msgResponse.sid}`);
        } catch (smsErr) {
            console.error('[WorkflowService] Twilio SMS API error:', smsErr.message);
            throw smsErr;
        }
    }

    /**
     * Webhook Node Handler
     */
    async handleWebhookNode(node, context) {
        const { url, method = 'POST', headers = {} } = node.data || {};
        if (!url) return;

        console.log(`[WorkflowService] Calling webhook ${url}`);

        await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(context)
        });
    }

    /**
     * HTTP Request Node Handler (Advanced)
     */
    async handleHttpRequestNode(node, context) {
        const { url, method = 'GET', headers = [], body } = node.data || {};
        if (!url) {
            console.warn('[WorkflowService] HTTP Request skipped: No URL provided');
            return;
        }

        const flatContext = this.flattenContext(context);
        const interpolatedUrl = this.interpolate(url, flatContext, context);

        // Prepare headers
        const requestHeaders = {};
        if (Array.isArray(headers)) {
            headers.forEach(h => {
                if (h.key) {
                    requestHeaders[h.key] = this.interpolate(h.value || '', flatContext, context);
                }
            });
        }

        // Prepare body
        let requestBody = null;
        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
            requestBody = this.interpolate(body, flatContext, context);

            // If Content-Type is application/json or missing, ensure it's set if not provided
            if (requestBody && !requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
                requestHeaders['Content-Type'] = 'application/json';
            }
        }

        console.log(`[WorkflowService] Making HTTP ${method} request to ${interpolatedUrl}`);

        try {
            const fetchOptions = {
                method: method.toUpperCase(),
                headers: requestHeaders
            };

            if (requestBody) {
                fetchOptions.body = requestBody;
            }

            const response = await fetch(interpolatedUrl, fetchOptions);
            const responseText = await response.text();

            console.log(`[WorkflowService] HTTP Request to ${interpolatedUrl} returned status ${response.status}`);

            // Try to parse JSON for logging/usage
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                responseData = responseText;
            }

            // Store the result in the context for downstream nodes
            context.last_response = responseData;

            // If response is an object, merge it into context so variables can be resolved directly
            if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
                Object.assign(context, responseData);
                console.log(`[WorkflowService] Merged HTTP response object into context`);
            } else {
                console.log(`[WorkflowService] Stored response data in context.last_response`);
            }

        } catch (err) {
            console.error(`[WorkflowService] HTTP Request to ${interpolatedUrl} failed:`, err.message);
            throw err;
        }
    }

    async refreshHubspotToken(connection) {
        const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || process.env.HUBSPOT_APP_ID;
        const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || process.env.HUBSPOT_APP_SECRET;

        if (!HUBSPOT_CLIENT_ID || !HUBSPOT_CLIENT_SECRET) {
            console.error('[WorkflowService] HubSpot credentials not configured');
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
                    refresh_token: connection.refresh_token
                })
            });

            const data = await response.json();
            if (data.status === 'error' || !data.access_token) {
                console.error('[WorkflowService] HubSpot refresh failed:', data.message);
                return null;
            }

            // Update connection in database
            const { data: updated, error } = await supabase
                .from('connections')
                .update({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token || connection.refresh_token,
                    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
                })
                .eq('id', connection.id)
                .select()
                .single();

            if (error) {
                console.error('[WorkflowService] Database update failed:', error);
                return data.access_token;
            }

            return updated.access_token;
        } catch (err) {
            console.error('[WorkflowService] HubSpot refresh error:', err);
            return null;
        }
    }

    async handleHubspotNode(node, context, workflow) {
        const data = node.data || {};
        const actionType = data.actionId; // Use actionId for action nodes
        const connectionId = data.connectionId;

        if (!connectionId) {
            console.warn('[WorkflowService] No connection ID for HubSpot node');
            return;
        }

        // Fetch connection
        const { data: connection, error: connError } = await supabase
            .from('connections')
            .select('*')
            .eq('id', connectionId)
            .single();

        if (connError || !connection) {
            console.error('[WorkflowService] HubSpot connection not found:', connError);
            return;
        }

        let accessToken = connection.access_token;

        // Refresh token if needed (expires in < 5 mins)
        const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
        if (!expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
            console.log('[WorkflowService] HubSpot token expired or near expiry, refreshing...');
            const newToken = await this.refreshHubspotToken(connection);
            if (newToken) accessToken = newToken;
        }

        const flatContext = this.flattenContext(context);
        let endpoint = '';
        let method = 'POST';
        let body = {};

        try {
            if (actionType === 'create_contact') {
                endpoint = 'https://api.hubapi.com/crm/v3/objects/contacts';
                body = {
                    properties: {
                        email: this.interpolate(data.email, flatContext, context),
                        firstname: this.interpolate(data.firstname, flatContext, context),
                        phone: this.interpolate(data.phone, flatContext, context)
                    }
                };
            } else if (actionType === 'update_contact') {
                const identifier = this.interpolate(data.contact_identifier, flatContext, context);
                endpoint = `https://api.hubapi.com/crm/v3/objects/contacts/${identifier}`;
                method = 'PATCH';
                const propertiesStr = this.interpolate(data.properties_json || '{}', flatContext, context) || '{}';
                let properties = {};
                try {
                    properties = JSON.parse(propertiesStr);
                } catch (e) {
                    console.error('[WorkflowService] Failed to parse HubSpot properties JSON:', e);
                }
                body = { properties };
            } else if (actionType === 'create_company') {
                endpoint = 'https://api.hubapi.com/crm/v3/objects/companies';
                body = {
                    properties: {
                        name: this.interpolate(data.company_name, flatContext, context),
                        domain: this.interpolate(data.domain, flatContext, context)
                    }
                };
            } else if (actionType === 'create_deal') {
                endpoint = 'https://api.hubapi.com/crm/v3/objects/deals';
                body = {
                    properties: {
                        dealname: this.interpolate(data.dealname, flatContext, context),
                        amount: this.interpolate(data.amount, flatContext, context)
                    }
                };
            } else if (actionType === 'create_associations') {
                const fromId = this.interpolate(data.from_id, flatContext, context);
                const toId = this.interpolate(data.to_id, flatContext, context);
                const assocType = data.association_type || 'contact_to_company';

                const fromType = assocType.split('_to_')[0];
                const toType = assocType.split('_to_')[1];

                const fromPlural = fromType === 'company' ? 'companies' : `${fromType}s`;
                const toPlural = toType === 'company' ? 'companies' : `${toType}s`;

                // HubSpot associations v4 API
                endpoint = `https://api.hubapi.com/crm/v4/objects/${fromPlural}/${fromId}/associations/default/${toPlural}/${toId}`;
                method = 'PUT';
                body = null; // PUT to this endpoint doesn't need body for default association
            }

            if (!endpoint) return;

            console.log(`[WorkflowService] HubSpot API call: ${method} ${endpoint}`);

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: body ? JSON.stringify(body) : undefined
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[WorkflowService] HubSpot API error (${response.status}):`, errorData);
                throw new Error(`HubSpot API error: ${response.statusText}`);
            }

            const responseData = await response.json().catch(() => ({ success: true }));
            context.last_hubspot_response = responseData;
            console.log('[WorkflowService] HubSpot action successful');

        } catch (err) {
            console.error('[WorkflowService] HubSpot action failed:', err);
            throw err;
        }
    }


    /**
     * Slack Node Handler - Uses connections table
     */
    async handleSlackNode(node, context, workflow) {
        const { connectionId, channel, message, action = 'send_message' } = node.data || {};

        if (!connectionId) {
            console.error('[WorkflowService] Slack node missing connectionId');
            throw new Error('Slack connection not configured');
        }

        // Fetch connection from database
        const { data: connection, error: connError } = await supabase
            .from('connections')
            .select('*')
            .eq('id', connectionId)
            .eq('user_id', workflow.user_id)
            .eq('is_active', true)
            .single();

        if (connError || !connection) {
            console.error('[WorkflowService] Slack connection not found:', connectionId);
            throw new Error('Slack connection not found or inactive');
        }

        const flatContext = this.flattenContext(context);
        const interpolatedChannel = this.interpolate(channel || '#general', flatContext, context);
        const interpolatedMessage = this.interpolate(message || '', flatContext, context);

        console.log(`[WorkflowService] Executing Slack action: ${action} to ${interpolatedChannel}`);

        try {
            if (action === 'send_message') {
                const response = await fetch('https://slack.com/api/chat.postMessage', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${connection.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        channel: interpolatedChannel,
                        text: interpolatedMessage
                    })
                });

                const result = await response.json();
                if (!result.ok) {
                    throw new Error(result.error || 'Slack API error');
                }
                console.log(`[WorkflowService] Slack message sent successfully to ${interpolatedChannel}`);
            } else {
                console.warn(`[WorkflowService] Unsupported Slack action: ${action}`);
            }
        } catch (err) {
            console.error('[WorkflowService] Slack API error:', err.message);
            throw err;
        }
    }

    /**
     * Call Lead Node Handler
     */
    async handleCallLeadNode(node, context, workflow) {
        const { to_number, recipient_name, assistant_id } = node.data || {};
        const flatContext = this.flattenContext(context);

        const targetNumber = this.interpolate(to_number || '{phone_number}', flatContext, context);
        const contactName = this.interpolate(recipient_name || '{name}', flatContext, context);

        // Use node's assistant_id or fall back to workflow's assistant_id
        const assistantId = assistant_id || workflow.assistant_id;

        if (!targetNumber || targetNumber === '{phone_number}') {
            console.warn('[WorkflowService] Call Lead skipped: No target number found in context');
            return;
        }

        if (!assistantId) {
            console.warn('[WorkflowService] Call Lead skipped: No assistant selected');
            return;
        }

        console.log(`[WorkflowService] Initiating Call Lead to ${targetNumber} using assistant ${assistantId} (Node: ${node.id})`);

        try {
            // Get the base URL for the backend
            const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;

            // Initiate the call via the cleaner LiveKit outbound-calls API
            const response = await fetch(`${baseUrl}/api/v1/livekit/outbound-calls/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phoneNumber: targetNumber,
                    contactName: contactName,
                    assistantId: assistantId,
                    userId: workflow.user_id, // Pass user ID for tracking lead calls
                    campaignId: null // Lead calls don't have a campaign
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to initiate outbound call');
            }

            console.log(`[WorkflowService] Call Lead initiated successfully: ${result.callSid}`);
        } catch (err) {
            console.error('[WorkflowService] Call Lead failed:', err.message);
            throw err;
        }
    }


    /**
     * Condition Node Handler
     */
    handleConditionNode(node, context) {
        const { conditions = [], logic = 'AND' } = node.data || {};
        const flatContext = this.flattenContext(context);

        console.log(`[WorkflowService] Evaluating condition node ${node.id}`);
        console.log(`[WorkflowService] Flat context keys:`, Object.keys(flatContext));
        console.log(`[WorkflowService] outcome in flatContext:`, flatContext.outcome);
        console.log(`[WorkflowService] Conditions:`, JSON.stringify(conditions, null, 2));

        const results = conditions.map(c => {
            // Extract variable name from curly braces if present (e.g., "{outcome}" -> "outcome")
            const variableName = c.variable?.replace(/[{}]/g, '') || c.variable;

            // Support dot notation for nested properties (e.g., "appointment.status")
            let actual = '';
            if (variableName.includes('.')) {
                // Try to get from original context first (for nested objects)
                const keys = variableName.split('.');
                let value = context;
                for (const k of keys) {
                    if (value === undefined || value === null) {
                        break;
                    }
                    // Check callData if we're at the first level
                    if (k === 'appointment' && value.callData && value.callData.appointment) {
                        value = value.callData.appointment;
                    } else if (typeof value === 'object') {
                        value = value[k];
                    } else {
                        value = undefined;
                        break;
                    }
                }
                actual = String(value !== undefined && value !== null ? value : '').toLowerCase();
            } else {
                // Simple variable lookup from flattened context
                actual = String(flatContext[variableName] || '').toLowerCase();
            }

            const expected = String(c.value || '').toLowerCase();
            const result = (() => {
                switch (c.operator) {
                    case 'equals': return actual === expected;
                    case 'not_equals': return actual !== expected;
                    case 'contains': return actual.includes(expected);
                    case 'not_contains': return !actual.includes(expected);
                    case 'exists': return actual !== '' && actual !== 'undefined' && actual !== 'null';
                    default: return true;
                }
            })();
            console.log(`[WorkflowService] Condition check: ${c.variable} (${actual}) ${c.operator} ${c.value} (${expected}) = ${result}`);
            return result;
        });

        const finalResult = logic === 'OR' ? results.some(r => r) : results.every(r => r);
        console.log(`[WorkflowService] Condition node result (${logic}): ${finalResult}`);
        return finalResult;
    }

    /**
     * Edge evaluation
     */
    evaluateEdgeCondition(edge, context) {
        const condition = edge.data?.condition || 'always';
        if (condition === 'always') return true;
        if (condition === 'router_true') return true; // Router true path always allowed
        if (condition === 'router_false') return true; // Router false path always allowed

        const outcome = (context.outcome || '').toLowerCase();
        if (condition === 'booked') return outcome.includes('booked');
        if (condition === 'not_booked') return !outcome.includes('booked');

        return true;
    }

    /**
     * Flatten context for interpolation
     */
    flattenContext(context) {
        const flat = { ...context };

        // Helper to extract value from nested structured_data fields
        const extractStructuredValue = (value) => {
            if (typeof value === 'string') {
                return value;
            }
            if (typeof value === 'object' && value !== null && value.value !== undefined) {
                return value.value;
            }
            return value;
        };

        // Flatten structured_data if present
        if (context.structured_data && typeof context.structured_data === 'object') {
            // Flatten structured_data, handling nested object format
            for (const [key, value] of Object.entries(context.structured_data)) {
                flat[key] = extractStructuredValue(value);
            }
        }

        // Flatten callData properties if present (for backward compatibility)
        if (context.callData && typeof context.callData === 'object') {
            Object.assign(flat, context.callData);
            // Also flatten structured_data from callData if present
            if (context.callData.structured_data && typeof context.callData.structured_data === 'object') {
                // Flatten structured_data, handling nested object format
                for (const [key, value] of Object.entries(context.callData.structured_data)) {
                    flat[key] = extractStructuredValue(value);
                }
            }
            // Also flatten appointment object from callData
            if (context.callData.appointment && typeof context.callData.appointment === 'object') {
                // Add appointment fields at top level with appointment_ prefix
                flat.appointment_status = context.callData.appointment.status || '';
                flat.appointment_start_time = context.callData.appointment.start_time || '';
                flat.appointment_end_time = context.callData.appointment.end_time || '';
                flat.appointment_timezone = context.callData.appointment.timezone || '';
                flat.appointment_calendar = context.callData.appointment.calendar || '';
                flat.appointment_booking_link = context.callData.appointment.booking_link || '';
                // Flatten contact info
                if (context.callData.appointment.contact) {
                    flat.appointment_contact_name = context.callData.appointment.contact.name || '';
                    flat.appointment_contact_email = context.callData.appointment.contact.email || '';
                    flat.appointment_contact_phone = context.callData.appointment.contact.phone || '';
                }
            }
        }

        // Also check for appointment at top level (in case callData was spread)
        if (context.appointment && typeof context.appointment === 'object') {
            // Add appointment fields at top level with appointment_ prefix
            flat.appointment_status = context.appointment.status || flat.appointment_status || '';
            flat.appointment_start_time = context.appointment.start_time || flat.appointment_start_time || '';
            flat.appointment_end_time = context.appointment.end_time || flat.appointment_end_time || '';
            flat.appointment_timezone = context.appointment.timezone || flat.appointment_timezone || '';
            flat.appointment_calendar = context.appointment.calendar || flat.appointment_calendar || '';
            flat.appointment_booking_link = context.appointment.booking_link || flat.appointment_booking_link || '';
            // Flatten contact info
            if (context.appointment.contact) {
                flat.appointment_contact_name = context.appointment.contact.name || flat.appointment_contact_name || '';
                flat.appointment_contact_email = context.appointment.contact.email || flat.appointment_contact_email || '';
                flat.appointment_contact_phone = context.appointment.contact.phone || flat.appointment_contact_phone || '';
            }
        }

        // Add convenient aliases for common fields
        // Name: try appointment.contact.name, then structured_data.name, then booking_name
        if (!flat.name) {
            flat.name = flat.appointment_contact_name ||
                flat['Customer Name'] ||
                flat.booking_name ||
                (context.structured_data && (context.structured_data.name || (context.structured_data['Customer Name'] &&
                    (typeof context.structured_data['Customer Name'] === 'object' ? context.structured_data['Customer Name'].value : context.structured_data['Customer Name'])))) ||
                (context.callData && context.callData.structured_data && (context.callData.structured_data.name ||
                    (context.callData.structured_data['Customer Name'] && (typeof context.callData.structured_data['Customer Name'] === 'object' ?
                        context.callData.structured_data['Customer Name'].value : context.callData.structured_data['Customer Name'])))) ||
                '';
        }

        // Email: try appointment.contact.email, then structured_data.email, then booking_email
        if (!flat.email) {
            flat.email = flat.appointment_contact_email ||
                flat.booking_email ||
                (context.structured_data && context.structured_data.email) ||
                (context.callData && context.callData.structured_data && context.callData.structured_data.email) ||
                '';
        }

        // Phone: try appointment.contact.phone, then structured_data.phone, then booking_phone
        if (!flat.phone) {
            flat.phone = flat.appointment_contact_phone ||
                flat.booking_phone ||
                (context.structured_data && context.structured_data.phone) ||
                (context.callData && context.callData.structured_data && context.callData.structured_data.phone) ||
                '';
        }

        // Add phone_number alias if missing
        if (!flat.phone_number) {
            flat.phone_number = flat.phone;
        }

        // Booking status: use appointment.status if available
        if (!flat.booking_status) {
            flat.booking_status = flat.appointment_status || '';
        }

        return flat;
    }

    /**
     * Simple string interpolation with support for nested paths (dot notation)
     * Supports both flattened context (for backward compatibility) and original context (for dot notation)
     */
    interpolate(str, flatContext, originalContext = null) {
        if (!str || typeof str !== 'string') return str || '';
        return str.replace(/{([^}]+)}/g, (match, key) => {
            // First try flattened context (backward compatibility)
            if (flatContext[key] !== undefined) {
                return String(flatContext[key] || '');
            }

            // If key contains dot notation, try original context
            if (originalContext && key.includes('.')) {
                const keys = key.split('.');
                let value = originalContext;
                for (const k of keys) {
                    if (value === undefined || value === null) {
                        break; // Path doesn't exist
                    }
                    // Handle callData nesting (e.g., callData.structured_data.name)
                    if (k === 'callData' && value.callData) {
                        value = value.callData;
                        continue;
                    }
                    // Handle appointment nesting (e.g., appointment.contact.name)
                    if (k === 'appointment' && value.appointment) {
                        value = value.appointment;
                        continue;
                    }
                    // Handle nested object access (e.g., contact.name)
                    if (typeof value === 'object' && value !== null) {
                        value = value[k];
                    } else {
                        value = undefined;
                        break;
                    }
                }
                if (value !== undefined && value !== null) {
                    // Handle nested object format (e.g., {"value": "..."})
                    if (typeof value === 'object' && value.value !== undefined) {
                        return String(value.value);
                    }
                    return String(value);
                }
            }

            // Also try accessing from structured_data in flatContext if key is like "structured_data.name"
            if (key.includes('.')) {
                const keys = key.split('.');
                if (keys[0] === 'structured_data') {
                    // Try multiple paths: context.structured_data, context.callData.structured_data, flatContext.structured_data
                    let structData = flatContext.structured_data ||
                        (originalContext && originalContext.structured_data) ||
                        (originalContext && originalContext.callData && originalContext.callData.structured_data);

                    if (structData && typeof structData === 'object') {
                        const fieldName = keys[1];

                        // Try direct access first (e.g., structured_data.name)
                        if (structData[fieldName] !== undefined) {
                            const value = structData[fieldName];
                            // Handle nested object format like {"Customer Name": {"value": "Lily", ...}}
                            if (typeof value === 'object' && value !== null && value.value !== undefined) {
                                return String(value.value || '');
                            }
                            return String(value || '');
                        }

                        // Try "Customer Name" field if looking for "name"
                        if (fieldName === 'name' && structData['Customer Name']) {
                            const customerName = structData['Customer Name'];
                            if (typeof customerName === 'object' && customerName !== null && customerName.value !== undefined) {
                                return String(customerName.value || '');
                            }
                            return String(customerName || '');
                        }

                        // Try "booking_name" or "name" from structured_data
                        if (fieldName === 'name') {
                            const nameValue = structData['booking_name'] || structData['name'] || structData['Customer Name'];
                            if (nameValue) {
                                if (typeof nameValue === 'object' && nameValue !== null && nameValue.value !== undefined) {
                                    return String(nameValue.value || '');
                                }
                                return String(nameValue || '');
                            }
                        }

                        // Try nested access (e.g., structured_data.contact.name)
                        let nestedValue = structData;
                        for (const k of keys.slice(1)) {
                            if (nestedValue === undefined || nestedValue === null) {
                                break;
                            }
                            nestedValue = nestedValue[k];
                        }
                        if (nestedValue !== undefined && nestedValue !== null) {
                            // Handle nested object format
                            if (typeof nestedValue === 'object' && nestedValue.value !== undefined) {
                                return String(nestedValue.value || '');
                            }
                            return String(nestedValue);
                        }
                    }
                }
            }

            // Try accessing appointment fields directly (e.g., {appointment.status}, {appointment.contact.name})
            if (key.startsWith('appointment.')) {
                const appointmentPath = key.substring('appointment.'.length);
                const appointment = context.appointment || (context.callData && context.callData.appointment);

                if (appointment && typeof appointment === 'object') {
                    const keys = appointmentPath.split('.');
                    let value = appointment;
                    for (const k of keys) {
                        if (value === undefined || value === null) {
                            break;
                        }
                        if (typeof value === 'object' && value !== null) {
                            value = value[k];
                        } else {
                            value = undefined;
                            break;
                        }
                    }
                    if (value !== undefined && value !== null) {
                        return String(value);
                    }
                }
            }

            // Return original if not found
            return match;
        });
    }
}

export const workflowService = new WorkflowService();
