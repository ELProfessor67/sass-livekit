import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../utils/auth.js';

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/workflows
 * List all workflows for the user
 */
router.get('/', async (req, res) => {
    try {
        const workspaceId = req.workspaceId;
        const isMain = !workspaceId || workspaceId === 'main' || workspaceId === 'null' || workspaceId === 'undefined';

        let query = supabase
            .from('workflows')
            .select('*')
            .eq('user_id', req.user.id);

        if (!isMain) {
            query = query.eq('workspace_id', workspaceId);
        } else {
            query = query.is('workspace_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/v1/workflows
 * Create a new workflow
 */
router.post('/', async (req, res) => {
    try {
        const { name, nodes, edges, assistant_id, is_active } = req.body;
        const workspaceId = req.workspaceId;
        const isMain = !workspaceId || workspaceId === 'main' || workspaceId === 'null' || workspaceId === 'undefined';

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const { data, error } = await supabase
            .from('workflows')
            .insert({
                user_id: req.user.id,
                workspace_id: isMain ? null : workspaceId,
                assistant_id: assistant_id || null,
                name,
                nodes: nodes || [],
                edges: edges || [],
                is_active: is_active !== undefined ? is_active : true
            })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PATCH /api/v1/workflows/:id
 * Update a workflow
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const workspaceId = req.workspaceId;
        const isMain = !workspaceId || workspaceId === 'main' || workspaceId === 'null' || workspaceId === 'undefined';

        // Ensure user owns the workflow and it's in the correct workspace
        let query = supabase
            .from('workflows')
            .select('id')
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (!isMain) {
            query = query.eq('workspace_id', workspaceId);
        } else {
            query = query.is('workspace_id', null);
        }

        const { data: workflow, error: fetchError } = await query.single();

        if (fetchError || !workflow) {
            return res.status(404).json({ success: false, message: 'Workflow not found in this workspace' });
        }

        const { data, error } = await supabase
            .from('workflows')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error updating workflow:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/v1/workflows/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const workspaceId = req.workspaceId;
        const isMain = !workspaceId || workspaceId === 'main' || workspaceId === 'null' || workspaceId === 'undefined';

        let query = supabase
            .from('workflows')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (!isMain) {
            query = query.eq('workspace_id', workspaceId);
        } else {
            query = query.is('workspace_id', null);
        }

        const { error } = await query;

        if (error) throw error;
        res.json({ success: true, message: 'Workflow deleted' });
    } catch (error) {
        console.error('Error deleting workflow:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
