import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Role-based access control middleware
 * Similar to urban-new's checkSessionExpiration middleware
 * 
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['user', 'admin', 'super-admin'])
 */
export const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // First check if user is authenticated
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      if (!supabase) {
        return res.status(500).json({
          success: false,
          message: 'Database not configured'
        });
      }

      // Verify the token with Supabase
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);

      if (error || !authUser) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Get user role from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role, tenant, slug_name, is_active')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userError || !userData) {
        return res.status(403).json({
          success: false,
          message: 'User profile not found'
        });
      }

      // Check if user is active
      if (!userData.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is not active. Please verify your email.'
        });
      }

      // Check if user has required role
      const userRole = userData.role || 'user';
      
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      // Attach user data to request
      req.user = {
        id: authUser.id,
        email: authUser.email,
        role: userRole,
        tenant: userData.tenant,
        slug_name: userData.slug_name,
        is_active: userData.is_active
      };

      next();
    } catch (error) {
      console.error('Role auth middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Middleware to require tenant ownership
 * User must own the tenant (slug_name matches tenant) or be admin
 */
export const requireTenantOwner = async (req, res, next) => {
  try {
    const tenant = req.tenant || 'main';
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admins can access any tenant
    if (user.role === 'admin' || user.role === 'super-admin') {
      return next();
    }

    // For main tenant, allow users without slug_name
    if (tenant === 'main' && !user.slug_name) {
      return next();
    }

    // For whitelabel tenants, user must own the tenant
    if (user.slug_name === tenant) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `You do not have permission to access tenant "${tenant}"`
    });
  } catch (error) {
    console.error('Tenant owner middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export default {
  requireRole,
  requireTenantOwner
};



