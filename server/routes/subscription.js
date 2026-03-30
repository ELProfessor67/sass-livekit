import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '../stripe.js';

const router = express.Router();

const getSupabaseClient = () =>
    createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const validateAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        const token = authHeader.substring(7);
        const supabase = getSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Invalid token' });
        req.user = user;
        req.userId = user.id;
        next();
    } catch (error) {
        console.error('Error validating auth:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * POST /api/v1/subscription/change-plan
 * Change user's plan. Updates DB and cancels/creates Stripe subscription if applicable.
 */
router.post('/change-plan', validateAuth, async (req, res) => {
    try {
        const { plan } = req.body;
        if (!plan || typeof plan !== 'string') {
            return res.status(400).json({ success: false, error: 'plan is required' });
        }

        const validPlans = ['free', 'starter', 'professional', 'enterprise'];
        if (!validPlans.includes(plan.toLowerCase())) {
            return res.status(400).json({ success: false, error: 'Invalid plan' });
        }

        const supabase = getSupabaseClient();

        // Fetch current user data
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('plan, stripe_customer_id, billing')
            .eq('id', req.userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const newPlan = plan.toLowerCase();
        const currentPlan = (userData.plan || 'free').toLowerCase();

        if (newPlan === currentPlan) {
            return res.json({ success: true, message: 'Already on this plan', plan: newPlan });
        }

        // If user has a Stripe customer and active subscription, cancel it
        if (userData.stripe_customer_id && stripe) {
            try {
                const billing = userData.billing && typeof userData.billing === 'object' ? userData.billing : {};
                const subscriptionId = billing?.subscription?.id;

                if (subscriptionId) {
                    // Cancel at period end for upgrades/downgrades with grace period
                    await stripe.subscriptions.cancel(subscriptionId, {
                        invoice_now: false,
                        prorate: true
                    });
                    console.log(`[Subscription] Cancelled Stripe subscription ${subscriptionId} for user ${req.userId}`);
                }
            } catch (stripeError) {
                // Non-fatal: still update the plan in DB
                console.warn('[Subscription] Stripe cancel error (non-fatal):', stripeError.message);
            }
        }

        // Update plan in DB
        const billingUpdate = {};
        if (userData.billing && typeof userData.billing === 'object') {
            billingUpdate.billing = {
                ...userData.billing,
                plan_changed_at: new Date().toISOString(),
                previous_plan: currentPlan,
                subscription: newPlan === 'free' ? null : (userData.billing?.subscription || null)
            };
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ plan: newPlan, ...billingUpdate })
            .eq('id', req.userId);

        if (updateError) {
            console.error('[Subscription] DB update error:', updateError);
            return res.status(500).json({ success: false, error: 'Failed to update plan' });
        }

        console.log(`[Subscription] User ${req.userId} changed plan: ${currentPlan} → ${newPlan}`);

        return res.json({
            success: true,
            message: `Plan changed to ${newPlan}`,
            plan: newPlan,
            previousPlan: currentPlan
        });
    } catch (error) {
        console.error('Error in POST /subscription/change-plan:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/v1/subscription/cancel
 * Cancel user's subscription. Downgrades to free plan, cancels Stripe if applicable.
 */
router.post('/cancel', validateAuth, async (req, res) => {
    try {
        const { reason, feedback, immediate = false } = req.body;
        const supabase = getSupabaseClient();

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('plan, stripe_customer_id, billing')
            .eq('id', req.userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if ((userData.plan || 'free').toLowerCase() === 'free') {
            return res.json({ success: true, message: 'Already on free plan', plan: 'free' });
        }

        // Cancel Stripe subscription if present
        let cancelledAt = null;
        let periodEnd = null;

        if (userData.stripe_customer_id && stripe) {
            try {
                const billing = userData.billing && typeof userData.billing === 'object' ? userData.billing : {};
                const subscriptionId = billing?.subscription?.id;

                if (subscriptionId) {
                    let cancelled;
                    if (immediate) {
                        cancelled = await stripe.subscriptions.cancel(subscriptionId);
                    } else {
                        // Cancel at period end (let them keep access until billing period ends)
                        cancelled = await stripe.subscriptions.update(subscriptionId, {
                            cancel_at_period_end: true
                        });
                    }
                    cancelledAt = new Date().toISOString();
                    if (cancelled.current_period_end) {
                        periodEnd = new Date(cancelled.current_period_end * 1000).toISOString();
                    }
                    console.log(`[Subscription] Cancelled Stripe subscription ${subscriptionId} for user ${req.userId}`);
                }
            } catch (stripeError) {
                console.warn('[Subscription] Stripe cancel error (non-fatal):', stripeError.message);
            }
        }

        const previousPlan = userData.plan;
        const billingData = userData.billing && typeof userData.billing === 'object' ? userData.billing : {};

        const { error: updateError } = await supabase
            .from('users')
            .update({
                plan: 'free',
                billing: {
                    ...billingData,
                    cancelled_at: cancelledAt || new Date().toISOString(),
                    cancellation_reason: reason || null,
                    cancellation_feedback: feedback || null,
                    previous_plan: previousPlan,
                    access_until: periodEnd || null,
                    subscription: null
                }
            })
            .eq('id', req.userId);

        if (updateError) {
            console.error('[Subscription] DB cancel error:', updateError);
            return res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
        }

        console.log(`[Subscription] User ${req.userId} cancelled plan ${previousPlan}`);

        return res.json({
            success: true,
            message: 'Subscription cancelled',
            plan: 'free',
            previousPlan,
            accessUntil: periodEnd
        });
    } catch (error) {
        console.error('Error in POST /subscription/cancel:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/v1/subscription/assign-workspace-minutes
 * Assign minutes from user's pool to a specific workspace.
 */
router.post('/assign-workspace-minutes', validateAuth, async (req, res) => {
    try {
        const { workspaceId, minutes } = req.body;

        if (!workspaceId || typeof workspaceId !== 'string') {
            return res.status(400).json({ success: false, error: 'workspaceId is required' });
        }
        if (typeof minutes !== 'number' || minutes < 0) {
            return res.status(400).json({ success: false, error: 'minutes must be a non-negative number' });
        }

        const supabase = getSupabaseClient();

        // Verify workspace belongs to this user
        const { data: wsData, error: wsError } = await supabase
            .from('workspace_settings')
            .select('id, workspace_name, minute_limit, minutes_used, user_id')
            .eq('id', workspaceId)
            .eq('user_id', req.userId)
            .single();

        if (wsError || !wsData) {
            return res.status(404).json({ success: false, error: 'Workspace not found or access denied' });
        }

        // Fetch user's total minutes and all other workspace allocations
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('minutes_limit, minutes_used, is_unlimited')
            .eq('id', req.userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Get all workspace allocations excluding the current one
        const { data: allWorkspaces, error: wsListError } = await supabase
            .from('workspace_settings')
            .select('id, minute_limit')
            .eq('user_id', req.userId)
            .neq('id', workspaceId);

        if (wsListError) {
            return res.status(500).json({ success: false, error: 'Failed to fetch workspace data' });
        }

        // Calculate total allocated to OTHER workspaces
        const otherAllocated = (allWorkspaces || []).reduce((sum, ws) => sum + (ws.minute_limit || 0), 0);
        const totalUserMinutes = userData.minutes_limit || 0;
        const maxAssignable = totalUserMinutes - otherAllocated;

        if (!userData.is_unlimited && minutes > maxAssignable) {
            return res.status(400).json({
                success: false,
                error: `Cannot allocate ${minutes} minutes. You have ${maxAssignable} minutes available to assign (${totalUserMinutes} total - ${otherAllocated} assigned to other workspaces).`,
                available: maxAssignable,
                requested: minutes
            });
        }

        // Update workspace minute limit
        const { error: updateError } = await supabase
            .from('workspace_settings')
            .update({ minute_limit: minutes })
            .eq('id', workspaceId)
            .eq('user_id', req.userId);

        if (updateError) {
            console.error('[Subscription] Workspace update error:', updateError);
            return res.status(500).json({ success: false, error: 'Failed to update workspace minutes' });
        }

        console.log(`[Subscription] User ${req.userId} assigned ${minutes} minutes to workspace ${workspaceId}`);

        return res.json({
            success: true,
            message: `Assigned ${minutes} minutes to workspace "${wsData.workspace_name}"`,
            workspaceId,
            previousLimit: wsData.minute_limit,
            newLimit: minutes
        });
    } catch (error) {
        console.error('Error in POST /subscription/assign-workspace-minutes:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/v1/subscription/workspace-minutes
 * Get user's minutes pool and all workspace allocations.
 */
router.get('/workspace-minutes', validateAuth, async (req, res) => {
    try {
        const supabase = getSupabaseClient();

        const [userResult, workspacesResult] = await Promise.all([
            supabase
                .from('users')
                .select('minutes_limit, minutes_used, is_unlimited')
                .eq('id', req.userId)
                .single(),
            supabase
                .from('workspace_settings')
                .select('id, workspace_name, minute_limit, minutes_used')
                .eq('user_id', req.userId)
        ]);

        if (userResult.error) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const userData = userResult.data;
        const workspaces = workspacesResult.data || [];
        const totalAssigned = workspaces.reduce((sum, ws) => sum + (ws.minute_limit || 0), 0);

        return res.json({
            success: true,
            data: {
                totalMinutes: userData.minutes_limit || 0,
                usedMinutes: userData.minutes_used || 0,
                isUnlimited: !!userData.is_unlimited,
                totalAssigned,
                unassigned: Math.max(0, (userData.minutes_limit || 0) - totalAssigned),
                workspaces: workspaces.map(ws => ({
                    id: ws.id,
                    name: ws.workspace_name,
                    allocated: ws.minute_limit || 0,
                    used: ws.minutes_used || 0,
                    remaining: Math.max(0, (ws.minute_limit || 0) - (ws.minutes_used || 0))
                }))
            }
        });
    } catch (error) {
        console.error('Error in GET /subscription/workspace-minutes:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
