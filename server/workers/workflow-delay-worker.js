// server/workers/workflow-delay-worker.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { workflowService } from '../services/workflow-service.js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

class WorkflowDelayWorker {
    constructor() {
        this.isRunning = false;
        this.checkInterval = 30000; // Check every 30 seconds
        this.timer = null;
    }

    /**
     * Start the worker
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[Workflow Delay Worker] Starting background worker...');

        this.processDueWorkflows();

        this.timer = setInterval(() => {
            this.processDueWorkflows();
        }, this.checkInterval);
    }

    /**
     * Stop the worker
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        console.log('[Workflow Delay Worker] Background worker stopped');
    }

    /**
     * Process all delayed workflows that are due
     */
    async processDueWorkflows() {
        try {
            const now = new Date().toISOString();

            // Get pending executions that are due
            const { data: dueExecutions, error } = await supabase
                .from('workflow_delayed_executions')
                .select('id')
                .eq('status', 'pending')
                .lte('scheduled_for', now)
                .limit(20); // Process in batches

            if (error) {
                console.error('[Workflow Delay Worker] Error fetching due workflows:', error);
                return;
            }

            if (!dueExecutions || dueExecutions.length === 0) {
                return;
            }

            console.log(`[Workflow Delay Worker] Found ${dueExecutions.length} workflows to resume`);

            for (const execution of dueExecutions) {
                // Resume each workflow
                // Note: workflowService.resumeWorkflow handles its own status updates to 'processing'/'completed'/'failed'
                await workflowService.resumeWorkflow(execution.id);
            }
        } catch (err) {
            console.error('[Workflow Delay Worker] Unexpected error in processDueWorkflows:', err);
        }
    }
}

export const workflowDelayWorker = new WorkflowDelayWorker();
