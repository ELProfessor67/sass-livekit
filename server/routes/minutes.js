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
 * GET /api/v1/minutes
 * Get current user's minutes information
 */
router.get('/', validateAuth, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('minutes_limit, minutes_used, plan')
      .eq('id', req.userId)
      .single();

    if (error) {
      console.error('Error fetching user minutes:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch minutes data' 
      });
    }

    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const minutesLimit = userData.minutes_limit || 0;
    const minutesUsed = userData.minutes_used || 0;
    const remainingMinutes = Math.max(0, minutesLimit - minutesUsed);
    const percentageUsed = minutesLimit > 0 
      ? Math.round((minutesUsed / minutesLimit) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        totalMinutes: minutesLimit,
        usedMinutes: minutesUsed,
        remainingMinutes,
        percentageUsed,
        planName: userData.plan || 'Free Plan'
      }
    });
  } catch (error) {
    console.error('Error in GET /minutes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Helper function to validate minutes distribution
 * Ensures the sum of all customer minutes doesn't exceed tenant admin's plan minutes
 * @param {Object} supabase - Supabase client
 * @param {string} tenantSlug - Tenant slug (white label admin's slug)
 * @param {string} adminUserId - Tenant admin's user ID
 * @param {number} newMinutes - New minutes to allocate
 * @param {string} customerId - Customer ID (null for new customers)
 * @returns {Promise<{valid: boolean, error?: string, adminMinutes?: number, currentTotal?: number, newTotal?: number}>}
 */
const validateMinutesDistribution = async (supabase, tenantSlug, adminUserId, newMinutes, customerId = null) => {
  try {
    // Get tenant admin's minutes_limit
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('minutes_limit')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminData) {
      return { valid: false, error: 'Tenant admin not found' };
    }

    const adminMinutes = adminData.minutes_limit || 0;

    // If admin has unlimited minutes (0), allow any distribution
    if (adminMinutes === 0) {
      return { valid: true, adminMinutes: 0, currentTotal: 0, newTotal: newMinutes };
    }

    // Prevent setting customer to unlimited (0) unless admin also has unlimited
    if (newMinutes === 0 && adminMinutes > 0) {
      return {
        valid: false,
        error: `Cannot set customer to unlimited minutes. Admin has limited plan (${adminMinutes} minutes). Only admins with unlimited plans can assign unlimited minutes to customers.`
      };
    }

    // Get sum of all customer minutes (excluding the admin)
    const { data: customers, error: customersError } = await supabase
      .from('users')
      .select('id, minutes_limit')
      .eq('tenant', tenantSlug)
      .neq('id', adminUserId); // Exclude admin

    if (customersError) {
      return { valid: false, error: 'Failed to fetch customer minutes' };
    }

    // Calculate current total minutes allocated to customers
    // Note: customers with minutes_limit = 0 (unlimited) are excluded from the sum
    // as they don't consume from the admin's pool
    const currentTotal = customers.reduce((sum, customer) => {
      // If updating existing customer, exclude their current minutes
      if (customerId && customer.id === customerId) {
        return sum;
      }
      // Only count customers with limited minutes (exclude unlimited/0)
      const customerMinutes = customer.minutes_limit || 0;
      return customerMinutes > 0 ? sum + customerMinutes : sum;
    }, 0);

    // Calculate new total
    const newTotal = currentTotal + newMinutes;

    // Validate: new total cannot exceed admin's minutes
    if (newTotal > adminMinutes) {
      const available = adminMinutes - currentTotal;
      return {
        valid: false,
        error: `Cannot allocate ${newMinutes} minutes. Available: ${available} minutes (Admin has ${adminMinutes} total, ${currentTotal} already allocated)`,
        adminMinutes,
        currentTotal,
        newTotal
      };
    }

    return {
      valid: true,
      adminMinutes,
      currentTotal,
      newTotal
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

/**
 * POST /api/v1/minutes/assign
 * Whitelabel admin endpoint to assign minutes to a customer
 * SECURITY: Only whitelabel admins can use this, and it validates against their minutes_limit
 */
router.post('/assign', validateAdminAccess, async (req, res) => {
  try {
    const { userId, minutes } = req.body;

    if (!userId || minutes === undefined || minutes === null) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId, minutes' 
      });
    }

    if (typeof minutes !== 'number' || minutes <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Minutes must be a positive number' 
      });
    }

    const supabase = getSupabaseClient();

    // Get admin's profile to check if they're a whitelabel admin
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('users')
      .select('id, slug_name, tenant, role, minutes_limit')
      .eq('id', req.userId)
      .single();

    if (adminProfileError || !adminProfile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Admin profile not found' 
      });
    }

    // SECURITY: Only whitelabel admins can distribute minutes via this endpoint
    const isMainTenantAdmin = adminProfile.tenant === 'main' && adminProfile.role === 'admin' && !adminProfile.slug_name;
    if (isMainTenantAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Main tenant admin cannot distribute minutes directly. Use whitelabel tenant admin account or use /api/v1/admin/customers/:customerId/minutes endpoint.'
      });
    }

    if (!adminProfile.slug_name) {
      return res.status(403).json({
        success: false,
        error: 'Only white label tenant admins can distribute minutes'
      });
    }

    // Check if target user exists and belongs to admin's tenant
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, role, tenant, minutes_limit')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ 
        success: false, 
        error: 'Target user not found' 
      });
    }

    // SECURITY: Verify customer belongs to admin's tenant
    if (targetUser.tenant !== adminProfile.slug_name) {
      return res.status(403).json({
        success: false,
        error: 'Customer does not belong to your tenant'
      });
    }

    // Prevent assigning minutes to admins
    if (targetUser.role === 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot assign minutes to admin users' 
      });
    }

    // Get current minutes
    const { data: currentData, error: fetchError } = await supabase
      .from('users')
      .select('minutes_limit, minutes_used')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching current minutes:', fetchError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch current minutes' 
      });
    }

    const currentLimit = currentData?.minutes_limit || 0;
    const newLimit = currentLimit + minutes;

    // SECURITY: Validate minutes distribution using the same validation as secure endpoint
    const validation = await validateMinutesDistribution(
      supabase,
      adminProfile.slug_name,
      req.userId,
      newLimit, // Total minutes after adding
      userId // Existing customer being updated
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        details: {
          adminMinutes: validation.adminMinutes,
          currentTotal: validation.currentTotal,
          requested: newLimit,
          customerCurrentMinutes: currentLimit
        }
      });
    }

    // Update user's minutes limit
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        minutes_limit: newLimit 
      })
      .eq('id', userId)
      .select('minutes_limit, minutes_used')
      .single();

    if (updateError) {
      console.error('Error updating minutes:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to assign minutes' 
      });
    }

    res.json({
      success: true,
      message: `Successfully assigned ${minutes} minutes to user`,
      data: {
        userId,
        previousLimit: currentLimit,
        newLimit: updatedUser.minutes_limit,
        minutesAdded: minutes,
        minutesUsed: updatedUser.minutes_used || 0,
        remainingMinutes: Math.max(0, updatedUser.minutes_limit - (updatedUser.minutes_used || 0))
      }
    });
  } catch (error) {
    console.error('Error in POST /minutes/assign:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * POST /api/v1/minutes/deduct
 * Internal endpoint to deduct minutes after a call (called by LiveKit service)
 * This should be protected by service role key or internal network
 */
router.post('/deduct', async (req, res) => {
  try {
    // Verify this is an internal request (service role or internal network)
    const serviceKey = req.headers['x-service-key'];
    const expectedServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceKey !== expectedServiceKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized - service key required' 
      });
    }

    const { userId, minutes } = req.body;

    if (!userId || minutes === undefined || minutes === null) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId, minutes' 
      });
    }

    if (typeof minutes !== 'number' || minutes < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Minutes must be a non-negative number' 
      });
    }

    const supabase = getSupabaseClient();

    // Get current minutes
    const { data: currentData, error: fetchError } = await supabase
      .from('users')
      .select('minutes_limit, minutes_used')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching current minutes:', fetchError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch current minutes' 
      });
    }

    if (!currentData) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const currentUsed = currentData.minutes_used || 0;
    const newUsed = currentUsed + minutes;

    // Update user's minutes used
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        minutes_used: newUsed 
      })
      .eq('id', userId)
      .select('minutes_limit, minutes_used')
      .single();

    if (updateError) {
      console.error('Error updating minutes used:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to deduct minutes' 
      });
    }

    const minutesLimit = updatedUser.minutes_limit || 0;
    const remainingMinutes = Math.max(0, minutesLimit - newUsed);

    // Check if user has exceeded limit and should be deactivated
    const exceededLimit = newUsed > minutesLimit;

    res.json({
      success: true,
      data: {
        userId,
        minutesDeducted: minutes,
        previousUsed: currentUsed,
        newUsed,
        minutesLimit,
        remainingMinutes,
        exceededLimit
      }
    });
  } catch (error) {
    console.error('Error in POST /minutes/deduct:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;



