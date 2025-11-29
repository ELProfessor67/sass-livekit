import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const getSupabaseClient = () => {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
};

// Middleware to validate authentication
const validateAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.substring(7);
        const supabase = getSupabaseClient();

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        req.userId = user.id;
        next();
    } catch (error) {
        console.error('Error validating auth:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Middleware to validate admin access
const validateAdminAccess = async (req, res, next) => {
    try {
        await validateAuth(req, res, async () => {
            const supabase = getSupabaseClient();

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', req.userId)
                .single();

            if (userError || !userData || userData.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            next();
        });
    } catch (error) {
        console.error('Error validating admin access:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/v1/admin/minutes-pricing
 * Get minutes pricing configuration (admin only)
 */
router.get('/admin/minutes-pricing', validateAdminAccess, async (req, res) => {
    try {
        const supabase = getSupabaseClient();

        // Get admin's tenant
        const { data: adminData, error: adminError } = await supabase
            .from('users')
            .select('tenant, slug_name')
            .eq('id', req.userId)
            .single();

        if (adminError || !adminData) {
            return res.status(404).json({
                success: false,
                error: 'Admin profile not found'
            });
        }

        // Determine tenant (main or whitelabel)
        const tenant = adminData.slug_name || 'main';

        // Get pricing config for this tenant
        const { data: pricingConfig, error: pricingError } = await supabase
            .from('minutes_pricing_config')
            .select('*')
            .eq('tenant', tenant)
            .single();

        if (pricingError && pricingError.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Error fetching pricing config:', pricingError);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch pricing configuration'
            });
        }

        // If no config exists, return default values
        if (!pricingConfig) {
            return res.json({
                success: true,
                data: {
                    tenant,
                    price_per_minute: 0.01,
                    minimum_purchase: 0,
                    currency: 'USD',
                    is_active: true
                }
            });
        }

        res.json({
            success: true,
            data: pricingConfig
        });
    } catch (error) {
        console.error('Error in GET /admin/minutes-pricing:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * PUT /api/v1/admin/minutes-pricing
 * Update minutes pricing configuration (admin only)
 */
router.put('/admin/minutes-pricing', validateAdminAccess, async (req, res) => {
    try {
        const { price_per_minute, minimum_purchase, currency } = req.body;

        // Validate inputs
        if (price_per_minute !== undefined && (typeof price_per_minute !== 'number' || price_per_minute < 0)) {
            return res.status(400).json({
                success: false,
                error: 'price_per_minute must be a non-negative number'
            });
        }

        if (minimum_purchase !== undefined && (typeof minimum_purchase !== 'number' || minimum_purchase < 0)) {
            return res.status(400).json({
                success: false,
                error: 'minimum_purchase must be a non-negative number'
            });
        }

        const supabase = getSupabaseClient();

        // Get admin's tenant
        const { data: adminData, error: adminError } = await supabase
            .from('users')
            .select('tenant, slug_name')
            .eq('id', req.userId)
            .single();

        if (adminError || !adminData) {
            return res.status(404).json({
                success: false,
                error: 'Admin profile not found'
            });
        }

        const tenant = adminData.slug_name || 'main';

        // Prepare update data
        const updateData = {};
        if (price_per_minute !== undefined) updateData.price_per_minute = price_per_minute;
        if (minimum_purchase !== undefined) updateData.minimum_purchase = minimum_purchase;
        if (currency) updateData.currency = currency;

        // Upsert pricing config
        const { data: updatedConfig, error: updateError } = await supabase
            .from('minutes_pricing_config')
            .upsert({
                tenant,
                ...updateData,
                is_active: true
            }, {
                onConflict: 'tenant'
            })
            .select()
            .single();

        if (updateError) {
            console.error('Error updating pricing config:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update pricing configuration'
            });
        }

        res.json({
            success: true,
            message: 'Pricing configuration updated successfully',
            data: updatedConfig
        });
    } catch (error) {
        console.error('Error in PUT /admin/minutes-pricing:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/v1/minutes-pricing
 * Get current pricing for purchasing minutes (authenticated users)
 * - Whitelabel admins see main tenant pricing (set by main admin)
 * - Whitelabel customers see their whitelabel admin's tenant pricing (set by whitelabel admin)
 * - Main tenant users see main tenant pricing
 */
router.get('/minutes-pricing', validateAuth, async (req, res) => {
    try {
        const supabase = getSupabaseClient();

        // Get user's tenant and role
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('tenant, role, slug_name')
            .eq('id', req.userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
        }

        const tenant = userData.tenant || 'main';
        const isWhitelabelAdmin = userData.role === 'admin' && userData.slug_name;
        
        // Whitelabel admins buy at main tenant pricing (set by main admin)
        // Whitelabel customers buy at their whitelabel admin's tenant pricing (set by whitelabel admin)
        const pricingTenant = isWhitelabelAdmin ? 'main' : tenant;

        // Get pricing config
        const { data: pricingConfig, error: pricingError } = await supabase
            .from('minutes_pricing_config')
            .select('price_per_minute, minimum_purchase, currency')
            .eq('tenant', pricingTenant)
            .eq('is_active', true)
            .single();

        if (pricingError && pricingError.code !== 'PGRST116') {
            console.error('Error fetching pricing config:', pricingError);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch pricing'
            });
        }

        // Return default if no config exists
        const pricing = pricingConfig || {
            price_per_minute: 0.01,
            minimum_purchase: 0,
            currency: 'USD'
        };

        res.json({
            success: true,
            data: pricing
        });
    } catch (error) {
        console.error('Error in GET /minutes-pricing:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/v1/minutes/purchase
 * Purchase minutes (creates pending purchase, to be completed by payment webhook)
 * For whitelabel customers: deducts from whitelabel admin's minutes
 */
router.post('/minutes/purchase', validateAuth, async (req, res) => {
    try {
        const { minutes } = req.body;

        if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid minutes quantity is required'
            });
        }

        const supabase = getSupabaseClient();

        // Get user's tenant, role, and pricing
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('tenant, minutes_limit, role, slug_name')
            .eq('id', req.userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
        }

        const tenant = userData.tenant || 'main';
        const isWhitelabelCustomer = tenant !== 'main' && userData.role !== 'admin' && !userData.slug_name;

        // If user is a whitelabel customer, check whitelabel admin's minutes
        if (isWhitelabelCustomer) {
            // Find the whitelabel admin (user with slug_name matching customer's tenant)
            const { data: whitelabelAdmin, error: adminError } = await supabase
                .from('users')
                .select('id, minutes_limit, minutes_used, slug_name')
                .eq('slug_name', tenant)
                .eq('role', 'admin')
                .single();

            if (adminError || !whitelabelAdmin) {
                return res.status(404).json({
                    success: false,
                    error: 'Whitelabel admin not found. Please contact support.'
                });
            }

            // Check if whitelabel admin has enough minutes
            const adminAvailable = (whitelabelAdmin.minutes_limit || 0) - (whitelabelAdmin.minutes_used || 0);
            if (adminAvailable < minutes) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient minutes available. Please contact your administrator to purchase more minutes.'
                });
            }

            // Get pricing config for whitelabel admin's tenant (set by whitelabel admin for their customers)
            const { data: pricingConfig, error: pricingError } = await supabase
                .from('minutes_pricing_config')
                .select('*')
                .eq('tenant', tenant)
                .eq('is_active', true)
                .single();

            const pricing = pricingConfig || {
                price_per_minute: 0.01,
                minimum_purchase: 0,
                currency: 'USD'
            };

            // Check minimum purchase
            if (pricing.minimum_purchase > 0 && minutes < pricing.minimum_purchase) {
                return res.status(400).json({
                    success: false,
                    error: `Minimum purchase is ${pricing.minimum_purchase} minutes`
                });
            }

            // Calculate amount (for record keeping, but no payment needed)
            const amount = (minutes * pricing.price_per_minute).toFixed(2);

            // Deduct from whitelabel admin's minutes
            const adminNewUsed = (whitelabelAdmin.minutes_used || 0) + minutes;
            const { error: adminUpdateError } = await supabase
                .from('users')
                .update({ minutes_used: adminNewUsed })
                .eq('id', whitelabelAdmin.id);

            if (adminUpdateError) {
                console.error('Error updating whitelabel admin minutes:', adminUpdateError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to process purchase'
                });
            }

            // Add minutes to customer's account (handled in API, not trigger)
            const customerCurrentLimit = userData.minutes_limit || 0;
            const customerNewLimit = customerCurrentLimit + minutes;
            const { error: customerUpdateError } = await supabase
                .from('users')
                .update({ minutes_limit: customerNewLimit })
                .eq('id', req.userId);

            if (customerUpdateError) {
                console.error('Error updating customer minutes:', customerUpdateError);
                // Rollback admin minutes since purchase failed
                await supabase
                    .from('users')
                    .update({ minutes_used: whitelabelAdmin.minutes_used || 0 })
                    .eq('id', whitelabelAdmin.id);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to update customer minutes'
                });
            }

            // Create purchase record for customer (credit) - for accounting/history only
            // NOTE: We handle minutes in API above, not via trigger
            const { data: purchase, error: purchaseError } = await supabase
                .from('minutes_purchases')
                .insert({
                    user_id: req.userId,
                    minutes_purchased: minutes,
                    amount_paid: amount,
                    currency: pricing.currency,
                    payment_method: 'whitelabel_admin',
                    status: 'completed',
                    notes: `Purchased from whitelabel admin (${whitelabelAdmin.slug_name})`
                })
                .select()
                .single();

            if (purchaseError) {
                console.error('Error creating purchase record:', purchaseError);
                // Non-critical - log but don't fail since minutes were already added
            }

            // Create debit record for whitelabel admin (debit - minutes sold to customer)
            // Store positive values but use payment_method to identify as debit
            // NOTE: The database trigger should skip this record (payment_method = 'whitelabel_customer_sale')
            // and NOT add minutes to the admin's minutes_limit. This is just for accounting/audit purposes.
            const { data: debitRecord, error: debitError } = await supabase
                .from('minutes_purchases')
                .insert({
                    user_id: whitelabelAdmin.id,
                    minutes_purchased: minutes, // Store positive value
                    amount_paid: amount, // Store positive value
                    currency: pricing.currency,
                    payment_method: 'whitelabel_customer_sale', // This identifies it as a debit - trigger should skip it
                    status: 'completed',
                    notes: `Sold ${minutes} minutes to customer (${userData.name || req.userId})`
                })
                .select()
                .single();

            if (debitError) {
                console.error('Error creating debit record for whitelabel admin:', debitError);
                // Non-critical error - log but don't fail the transaction
            } else {
                // Verify that the trigger didn't incorrectly add minutes to admin
                // The admin's minutes_limit should NOT increase from this debit record
                const { data: verifyAdmin } = await supabase
                    .from('users')
                    .select('minutes_limit, minutes_used')
                    .eq('id', whitelabelAdmin.id)
                    .single();
                
                if (verifyAdmin) {
                    const expectedLimit = whitelabelAdmin.minutes_limit; // Should stay the same
                    if (verifyAdmin.minutes_limit !== expectedLimit) {
                        console.error(`[BUG] Admin minutes_limit incorrectly increased! Expected: ${expectedLimit}, Got: ${verifyAdmin.minutes_limit}. This debit record should NOT add minutes.`);
                        // Rollback the incorrect increase
                        await supabase
                            .from('users')
                            .update({ minutes_limit: expectedLimit })
                            .eq('id', whitelabelAdmin.id);
                    }
                }
            }

            // Get updated user balance
            const { data: updatedUser } = await supabase
                .from('users')
                .select('minutes_limit, minutes_used')
                .eq('id', req.userId)
                .single();

            res.json({
                success: true,
                message: `Successfully purchased ${minutes} minutes`,
                data: {
                    purchase,
                    new_balance: updatedUser?.minutes_limit || 0,
                    minutes_used: updatedUser?.minutes_used || 0
                }
            });
            return;
        }

        // Regular purchase flow (main tenant users or whitelabel admins)
        // Whitelabel admins buy at main tenant pricing (set by main admin)
        // Main tenant users also buy at main tenant pricing
        const isWhitelabelAdmin = userData.role === 'admin' && userData.slug_name;
        const pricingTenant = isWhitelabelAdmin ? 'main' : tenant;
        
        // Get pricing config
        const { data: pricingConfig, error: pricingError } = await supabase
            .from('minutes_pricing_config')
            .select('*')
            .eq('tenant', pricingTenant)
            .eq('is_active', true)
            .single();

        const pricing = pricingConfig || {
            price_per_minute: 0.01,
            minimum_purchase: 0,
            currency: 'USD'
        };

        // Check minimum purchase
        if (pricing.minimum_purchase > 0 && minutes < pricing.minimum_purchase) {
            return res.status(400).json({
                success: false,
                error: `Minimum purchase is ${pricing.minimum_purchase} minutes`
            });
        }

        // Calculate amount
        const amount = (minutes * pricing.price_per_minute).toFixed(2);

        // Add minutes to user's account (handled in API, not trigger)
        const currentLimit = userData.minutes_limit || 0;
        const newLimit = currentLimit + minutes;
        const { error: updateError } = await supabase
            .from('users')
            .update({ minutes_limit: newLimit })
            .eq('id', req.userId);

        if (updateError) {
            console.error('Error updating minutes:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update minutes'
            });
        }

        // Create purchase record for accounting/history (handled in API, not trigger)
        const { data: purchase, error: purchaseError } = await supabase
            .from('minutes_purchases')
            .insert({
                user_id: req.userId,
                minutes_purchased: minutes,
                amount_paid: amount,
                currency: pricing.currency,
                payment_method: 'demo', // In production: 'stripe'
                status: 'completed', // In production: 'pending' until webhook confirms
                notes: 'Demo purchase - auto-completed'
            })
            .select()
            .single();

        if (purchaseError) {
            console.error('Error creating purchase record:', purchaseError);
            // Non-critical - log but don't fail since minutes were already added
        }

        // Get updated user balance
        const { data: updatedUser } = await supabase
            .from('users')
            .select('minutes_limit, minutes_used')
            .eq('id', req.userId)
            .single();

        res.json({
            success: true,
            message: `Successfully purchased ${minutes} minutes`,
            data: {
                purchase,
                new_balance: updatedUser?.minutes_limit || 0,
                minutes_used: updatedUser?.minutes_used || 0
            }
        });
    } catch (error) {
        console.error('Error in POST /minutes/purchase:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/v1/minutes/purchase-history
 * Get user's purchase history
 */
router.get('/minutes/purchase-history', validateAuth, async (req, res) => {
    try {
        const supabase = getSupabaseClient();

        const { data: purchases, error } = await supabase
            .from('minutes_purchases')
            .select('*')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching purchase history:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch purchase history'
            });
        }

        res.json({
            success: true,
            data: purchases || []
        });
    } catch (error) {
        console.error('Error in GET /minutes/purchase-history:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/v1/admin/customers/:customerId/add-minutes
 * Manually add minutes to a user (admin only, for promotional/support purposes)
 */
router.post('/admin/customers/:customerId/add-minutes', validateAdminAccess, async (req, res) => {
    try {
        const { customerId } = req.params;
        const { minutes, notes } = req.body;

        if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid minutes quantity is required'
            });
        }

        const supabase = getSupabaseClient();

        // Verify customer exists
        const { data: customer, error: customerError } = await supabase
            .from('users')
            .select('id, name, contact')
            .eq('id', customerId)
            .single();

        if (customerError || !customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        // Add minutes to user's account (handled in API, not trigger)
        const { data: customerData, error: fetchError } = await supabase
            .from('users')
            .select('minutes_limit')
            .eq('id', customerId)
            .single();

        if (fetchError || !customerData) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch customer data'
            });
        }

        const currentLimit = customerData.minutes_limit || 0;
        const newLimit = currentLimit + minutes;
        const { error: updateError } = await supabase
            .from('users')
            .update({ minutes_limit: newLimit })
            .eq('id', customerId);

        if (updateError) {
            console.error('Error updating minutes:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to add minutes'
            });
        }

        // Create purchase record for accounting/history (handled in API, not trigger)
        const { data: purchase, error: purchaseError } = await supabase
            .from('minutes_purchases')
            .insert({
                user_id: customerId,
                minutes_purchased: minutes,
                amount_paid: 0,
                currency: 'USD',
                payment_method: 'manual',
                status: 'completed',
                notes: notes || 'Manually added by admin'
            })
            .select()
            .single();

        if (purchaseError) {
            console.error('Error creating manual purchase record:', purchaseError);
            // Non-critical - log but don't fail since minutes were already added
        }

        // Get updated balance
        const { data: updatedUser } = await supabase
            .from('users')
            .select('minutes_limit, minutes_used')
            .eq('id', customerId)
            .single();

        res.json({
            success: true,
            message: `Successfully added ${minutes} minutes to ${customer.name || customer.contact?.email || 'user'}`,
            data: {
                purchase,
                new_balance: updatedUser?.minutes_limit || 0
            }
        });
    } catch (error) {
        console.error('Error in POST /admin/customers/:customerId/add-minutes:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;
