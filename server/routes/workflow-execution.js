// server/routes/workflow-execution.js
import express from 'express';
import { workflowService } from '../services/workflow-service.js';

const router = express.Router();

/**
 * POST /api/v1/workflows/trigger
 * Trigger workflows for a given event and context
 */
router.post('/trigger', async (req, res) => {
    try {
        const { userId, assistantId, event, callData, outcome } = req.body;

        console.log(`[WorkflowExecution] Received trigger: event=${event}, outcome=${outcome}, assistant=${assistantId}, user=${userId}`);

        // Fire and forget (optional: depends if you want to wait for execution)
        // Pass both callData and top-level outcome field
        workflowService.triggerWorkflows(userId, assistantId, event, { ...callData, outcome });

        res.json({ success: true, message: 'Workflow execution started' });
    } catch (err) {
        console.error('[WorkflowExecutionRoute] Trigger failed:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
