// server/services/workflow-service.js
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
            console.log(`[WorkflowService] callData received:`, JSON.stringify(callData, null, 2));
            console.log(`[WorkflowService] outcome in callData:`, callData?.outcome, callData?.callData?.outcome);

            // 1. Fetch active workflows linked to this assistant
            const { data: activeWorkflows, error: workflowError } = await supabase
                .from('assistant_workflows')
                .select(`
          workflow_id,
          workflow:workflows!workflow_id(*)
        `)
                .eq('assistant_id', assistantId);

            if (workflowError) {
                console.error('[WorkflowService] Error fetching assistant workflows:', workflowError);
                return;
            }

            if (!activeWorkflows || activeWorkflows.length === 0) {
                console.log('[WorkflowService] No active workflows linked to assistant');
                return;
            }

            // 2. Filter workflows and start execution
            for (const entry of activeWorkflows) {
                const workflow = entry.workflow;
                if (workflow && workflow.is_active) {
                    // Pass full context including the event
                    // Extract outcome from various possible locations
                    const outcome = callData?.outcome || callData?.callData?.outcome || null;
                    const context = {
                        event,
                        userId,
                        assistantId,
                        ...callData,
                        // Explicitly set outcome at top level for condition node evaluation
                        outcome: outcome
                    };
                    console.log(`[WorkflowService] Executing workflow ${workflow.id} with context:`, JSON.stringify({
                        event: context.event,
                        outcome: context.outcome,
                        hasCallData: !!context.callData,
                        callDataOutcome: context.callData?.outcome
                    }, null, 2));
                    this.executeWorkflow(workflow, context);
                }
            }
        } catch (err) {
            console.error('[WorkflowService] Trigger failed:', err);
        }
    }

    /**
     * Root execution method for a workflow
     */
    async executeWorkflow(workflow, context, startNodeId = null) {
        const nodes = workflow.nodes || [];
        const edges = workflow.edges || [];

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
                    // 1. Explicit match
                    if (nodeEvent === event) return true;

                    // 2. Legacy fallback: if no event is defined on the node, treat it as call_ended
                    if (!nodeEvent && event === 'call_ended') return true;
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
            }
        } catch (err) {
            console.error(`[WorkflowService] Node ${nodeId} execution failed:`, err);
            // We might want to stop this branch on failure
            return;
        }

        if (!shouldContinue) return;

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

        let targetNumber = this.interpolate(to_number || '{phone_number}', flatContext);
        let body = this.interpolate(message || '', flatContext);

        if (!targetNumber || targetNumber === '{phone_number}') {
            console.warn('[WorkflowService] SMS skipped: No target number found in context');
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

        // Determine from number (prefer context, then credits, then env)
        let fromNumber = flatContext.agent_phone_number || credentials.phone_number || process.env.TWILIO_PHONE_NUMBER;

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
            const actual = String(flatContext[variableName] || '').toLowerCase();
            const expected = String(c.value || '').toLowerCase();
            const result = (() => {
                switch (c.operator) {
                    case 'equals': return actual === expected;
                    case 'not_equals': return actual !== expected;
                    case 'contains': return actual.includes(expected);
                    case 'not_contains': return !actual.includes(expected);
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
        // Flatten structured_data if present
        if (context.structured_data && typeof context.structured_data === 'object') {
            Object.assign(flat, context.structured_data);
        }
        // Flatten callData properties if present (for backward compatibility)
        if (context.callData && typeof context.callData === 'object') {
            Object.assign(flat, context.callData);
        }
        return flat;
    }

    /**
     * Simple string interpolation
     */
    interpolate(str, context) {
        return str.replace(/{([^}]+)}/g, (match, key) => {
            return context[key] !== undefined ? context[key] : match;
        });
    }
}

export const workflowService = new WorkflowService();
