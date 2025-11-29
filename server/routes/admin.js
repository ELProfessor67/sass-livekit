// import express from 'express';
// import { createClient } from '@supabase/supabase-js';

// const router = express.Router();

// // Initialize Supabase client with service role
// const getSupabaseClient = () => {
//   return createClient(
//     process.env.SUPABASE_URL,
//     process.env.SUPABASE_SERVICE_ROLE_KEY
//   );
// };

// /**
//  * Helper function to validate minutes distribution
//  * Ensures the sum of all customer minutes doesn't exceed tenant admin's plan minutes
//  * @param {Object} supabase - Supabase client
//  * @param {string} tenantSlug - Tenant slug (white label admin's slug)
//  * @param {string} adminUserId - Tenant admin's user ID
//  * @param {number} newMinutes - New minutes to allocate
//  * @param {string} customerId - Customer ID (null for new customers)
//  * @returns {Promise<{valid: boolean, error?: string, adminMinutes?: number, currentTotal?: number, newTotal?: number}>}
//  */
// const validateMinutesDistribution = async (supabase, tenantSlug, adminUserId, newMinutes, customerId = null) => {
//   try {
//     // Get tenant admin's minutes_limit
//     const { data: adminData, error: adminError } = await supabase
//       .from('users')
//       .select('minutes_limit')
//       .eq('id', adminUserId)
//       .single();

//     if (adminError || !adminData) {
//       return { valid: false, error: 'Tenant admin not found' };
//     }

//     const adminMinutes = adminData.minutes_limit || 0;

//     // If admin has unlimited minutes (0), allow any distribution
//     if (adminMinutes === 0) {
//       return { valid: true, adminMinutes: 0, currentTotal: 0, newTotal: newMinutes };
//     }

//     // Prevent setting customer to unlimited (0) unless admin also has unlimited
//     if (newMinutes === 0 && adminMinutes > 0) {
//       return {
//         valid: false,
//         error: `Cannot set customer to unlimited minutes. Admin has limited plan (${adminMinutes} minutes). Only admins with unlimited plans can assign unlimited minutes to customers.`
//       };
//     }

//     // Get sum of all customer minutes (excluding the admin)
//     const { data: customers, error: customersError } = await supabase
//       .from('users')
//       .select('id, minutes_limit')
//       .eq('tenant', tenantSlug)
//       .neq('id', adminUserId); // Exclude admin

//     if (customersError) {
//       return { valid: false, error: 'Failed to fetch customer minutes' };
//     }

//     // Calculate current total minutes allocated to customers
//     // Note: customers with minutes_limit = 0 (unlimited) are excluded from the sum
//     // as they don't consume from the admin's pool
//     const currentTotal = customers.reduce((sum, customer) => {
//       // If updating existing customer, exclude their current minutes
//       if (customerId && customer.id === customerId) {
//         return sum;
//       }
//       // Only count customers with limited minutes (exclude unlimited/0)
//       const customerMinutes = customer.minutes_limit || 0;
//       return customerMinutes > 0 ? sum + customerMinutes : sum;
//     }, 0);

//     // Calculate new total
//     const newTotal = currentTotal + newMinutes;

//     // Validate: new total cannot exceed admin's minutes
//     if (newTotal > adminMinutes) {
//       const available = adminMinutes - currentTotal;
//       return {
//         valid: false,
//         error: `Cannot allocate ${newMinutes} minutes. Available: ${available} minutes (Admin has ${adminMinutes} total, ${currentTotal} already allocated)`,
//         adminMinutes,
//         currentTotal,
//         newTotal
//       };
//     }

//     return {
//       valid: true,
//       adminMinutes,
//       currentTotal,
//       newTotal
//     };
//   } catch (error) {
//     return { valid: false, error: error.message };
//   }
// };

// // Middleware to validate admin access
// const validateAdminAccess = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({ error: 'Missing or invalid authorization header' });
//     }

//     const token = authHeader.substring(7);
//     const supabase = getSupabaseClient();

//     const { data: { user }, error } = await supabase.auth.getUser(token);

//     if (error || !user) {
//       return res.status(401).json({ error: 'Invalid token' });
//     }

//     // Check if user is admin (main tenant admin or whitelabel tenant admin)
//     const { data: userData, error: userError } = await supabase
//       .from('users')
//       .select('role, slug_name, tenant')
//       .eq('id', user.id)
//       .single();

//     if (userError || !userData) {
//       return res.status(403).json({ error: 'User not found' });
//     }

//     // Allow only admin role (main tenant admin or whitelabel tenant admin)
//     if (userData.role !== 'admin') {
//       return res.status(403).json({ error: 'Admin access required' });
//     }

//     req.user = user;
//     req.userId = user.id;
//     req.userRole = userData.role;
//     req.userSlug = userData.slug_name;
//     req.userTenant = userData.tenant;
//     next();
//   } catch (error) {
//     console.error('Error validating admin access:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// /**
//  * GET /api/v1/admin/users/emails
//  * Get emails for multiple users from auth.users
//  * (Kept for backward compatibility)
//  */
// router.get('/users/emails', validateAdminAccess, async (req, res) => {
//   try {
//     const { userIds } = req.query;

//     if (!userIds) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'userIds query parameter is required (comma-separated)' 
//       });
//     }

//     const userIdArray = Array.isArray(userIds) 
//       ? userIds 
//       : userIds.split(',').map(id => id.trim());

//     const supabase = getSupabaseClient();
//     const emailMap = {};

//     // Fetch emails for each user from auth.users
//     await Promise.all(
//       userIdArray.map(async (userId) => {
//         try {
//           const { data, error } = await supabase.auth.admin.getUserById(userId);
//           if (!error && data?.user?.email) {
//             emailMap[userId] = data.user.email;
//           }
//         } catch (err) {
//           console.warn(`Could not fetch email for user ${userId}:`, err);
//         }
//       })
//     );

//     res.json({
//       success: true,
//       data: emailMap
//     });
//   } catch (error) {
//     console.error('Error in GET /admin/users/emails:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Internal server error' 
//     });
//   }
// });

// /**
//  * GET /api/v1/admin/users
//  * Alternative implementation: Fetch from auth.users first, then enrich with users table
//  * 
//  * Flow:
//  * 1. Fetch all users from auth.users (has emails and IDs)
//  * 2. Fetch user profiles from users table by matching IDs
//  * 3. Merge and return complete user data
//  */
// router.get('/users', validateAdminAccess, async (req, res) => {
//   try {
//     const { page = 1, perPage = 1000, search } = req.query;
//     const supabase = getSupabaseClient();

//     // Determine admin type
//     const isMainTenantAdmin = req.userTenant === 'main' && req.userRole === 'admin' && !req.userSlug;
//     const isWhitelabelAdmin = req.userRole === 'admin' && req.userSlug;

//     // Step 1: Fetch all users from auth.users (source of truth for emails)
//     const pageNum = parseInt(page);
//     const perPageNum = parseInt(perPage);

//     let authUsers = [];
//     let hasMore = true;
//     let currentPage = 1;

//     // Fetch all users (handle pagination if needed)
//     while (hasMore && (perPageNum === 1000 || authUsers.length < perPageNum)) {
//       const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers({
//         page: currentPage,
//         perPage: 1000 // Fetch in batches of 1000
//       });

//       if (authError) {
//         console.error('Error fetching auth users:', authError);
//         return res.status(500).json({
//           success: false,
//           error: 'Failed to fetch users from auth system'
//         });
//       }

//       const users = authUsersData?.users || [];
//       authUsers = authUsers.concat(users);

//       // Check if there are more users
//       hasMore = users.length === 1000;
//       currentPage++;

//       // If we have a perPage limit and we've reached it, stop
//       if (perPageNum !== 1000 && authUsers.length >= perPageNum) {
//         authUsers = authUsers.slice(0, perPageNum);
//         hasMore = false;
//       }
//     }

//     // If no users, return empty result
//     if (authUsers.length === 0) {
//       return res.json({
//         success: true,
//         data: [],
//         total: 0
//       });
//     }

//     // Step 2: Extract user IDs and fetch profiles from users table
//     const userIds = authUsers.map(u => u.id);

//     // Build query based on admin type
//     let userProfilesQuery = supabase
//       .from('users')
//       .select('*')
//       .in('id', userIds);

//     // Tenant-based filtering:
//     // - Main tenant admin (tenant = 'main', role = 'admin', slug_name = NULL): 
//     //   see main tenant users (tenant = 'main') AND whitelabel admins (slug_name IS NOT NULL)
//     //   BUT NOT whitelabel customers (tenant != 'main' AND slug_name IS NULL)
//     // - Whitelabel tenant admin (tenant = slug, role = 'admin', slug_name = slug):
//     //   only see their customers (users where tenant = their slug_name)
//     //   Also include the admin themselves (where slug_name = their slug_name)
//     if (isMainTenantAdmin) {
//       // Main tenant admin sees: main tenant users OR whitelabel admins (but NOT whitelabel customers)
//       // We'll filter in JavaScript since PostgREST doesn't easily support (A OR B) AND NOT (C)
//       // Note: The JavaScript filter below will handle the actual filtering
//     } else if (isWhitelabelAdmin) {
//       // Whitelabel admin sees their customers (tenant = slug) OR themselves (slug_name = slug)
//       userProfilesQuery = userProfilesQuery.or(`tenant.eq.${req.userSlug},slug_name.eq.${req.userSlug}`);
//     }

//     const { data: userProfiles, error: profilesError } = await userProfilesQuery;

//     if (profilesError) {
//       console.error('Error fetching user profiles:', profilesError);
//       // Continue even if profiles fail - we'll use auth data only
//     }

//     // Step 3: Merge auth data with profile data
//     // For whitelabel admins, only include users that have a matching profile (belong to their tenant)
//     // For main tenant admin, only include users that match the filter (main tenant users or whitelabel admins)
//     const mergedUsers = authUsers
//       .map(authUser => {
//         // Find matching profile
//         const profile = userProfiles?.find(p => p.id === authUser.id) || null;

//         // For whitelabel admins, skip users without a matching profile (they don't belong to this tenant)
//         if (isWhitelabelAdmin && !profile) {
//           return null;
//         }

//         // For main tenant admin, only include users that match the filter:
//         // - Users with tenant = 'main' (main tenant users like zainab)
//         // - Users with slug_name IS NOT NULL (whitelabel admins like gomez)
//         // - Exclude users with tenant != 'main' AND slug_name IS NULL (whitelabel customers like andria)
//         // This ensures main tenant admin (zainab) can see:
//         //   - Main tenant users (tenant = 'main')
//         //   - Whitelabel admins (gomez with slug_name = 'gomezlouis')
//         //   - But NOT whitelabel customers (andria with tenant = 'gomezlouis' but no slug_name)
//         if (isMainTenantAdmin) {
//           if (!profile) {
//             return null; // Skip users without profile
//           }
//           const isMainTenant = profile.tenant === 'main';
//           const isWhitelabelAdminUser = profile.slug_name !== null && profile.slug_name !== undefined;

//           // Only include main tenant users or whitelabel admins
//           // Exclude whitelabel customers (tenant != 'main' AND slug_name IS NULL)
//           if (!isMainTenant && !isWhitelabelAdminUser) {
//             return null; // Exclude whitelabel customers (e.g., andria)
//           }
//         }

//         // Get slug_name from profile or auth metadata (fallback)
//         const slugName = profile?.slug_name || authUser.user_metadata?.slug || null;

//         // Build user object with email from auth and profile data
//         const user = {
//           id: authUser.id,
//           email: authUser.email, // Always from auth.users (source of truth)
//           name: profile?.name || authUser.user_metadata?.name || null,
//           role: profile?.role || 'user',
//           is_active: profile?.is_active ?? true,
//           company: profile?.company || null,
//           industry: profile?.industry || null,
//           created_on: profile?.created_on || authUser.created_at,
//           updated_at: profile?.updated_at || authUser.updated_at,
//           contact: {
//             email: authUser.email, // Primary email from auth
//             phone: profile?.contact?.phone || authUser.user_metadata?.phone || authUser.user_metadata?.contactPhone || null,
//             countryCode: profile?.contact?.countryCode || authUser.user_metadata?.countryCode || null,
//           },
//           // Include auth metadata
//           email_confirmed: authUser.email_confirmed_at !== null,
//           last_sign_in: authUser.last_sign_in_at,
//           // Include profile data if available
//           plan: profile?.plan || null,
//           onboarding_completed: profile?.onboarding_completed || null,
//           // Minutes data
//           minutes_limit: profile?.minutes_limit ?? null,
//           minutes_used: profile?.minutes_used ?? null,
//           // White label indicator - check both profile and auth metadata
//           is_whitelabel: !!slugName,
//           slug_name: slugName,
//           tenant: profile?.tenant || null,
//         };

//         return user;
//       })
//       .filter(user => user !== null); // Remove null entries (users without matching profiles for white label admins)

//     // Step 4: Apply search filter if provided
//     let filteredUsers = mergedUsers;
//     if (search) {
//       const searchLower = search.toLowerCase();
//       filteredUsers = mergedUsers.filter(user =>
//         user.name?.toLowerCase().includes(searchLower) ||
//         user.email?.toLowerCase().includes(searchLower) ||
//         user.company?.toLowerCase().includes(searchLower)
//       );
//     }

//     // Step 5: Sort by created date (newest first)
//     filteredUsers.sort((a, b) => {
//       const dateA = new Date(a.created_on || 0).getTime();
//       const dateB = new Date(b.created_on || 0).getTime();
//       return dateB - dateA;
//     });

//     res.json({
//       success: true,
//       data: filteredUsers,
//       total: filteredUsers.length
//     });
//   } catch (error) {
//     console.error('Error in GET /admin/users:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Internal server error'
//     });
//   }
// });

// /**
//  * DELETE /api/v1/admin/users/:userId
//  * Delete a user from both auth.users and public.users (admin only)
//  */
// router.delete('/users/:userId', validateAdminAccess, async (req, res) => {
//   try {
//     const { userId } = req.params;

//     if (!userId) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'User ID is required' 
//       });
//     }

//     const supabase = getSupabaseClient();

//     // First, delete from auth.users (this requires service role key)
//     const { error: authError } = await supabase.auth.admin.deleteUser(userId);

//     if (authError) {
//       console.error('Error deleting user from auth.users:', authError);
//       // Continue to try deleting from public.users even if auth deletion fails
//       // (in case the user was already deleted from auth but still exists in public.users)
//     }

//     // Then, delete from public.users
//     const { error: profileError } = await supabase
//       .from('users')
//       .delete()
//       .eq('id', userId);

//     if (profileError) {
//       console.error('Error deleting user from public.users:', profileError);
//       // If auth deletion succeeded but profile deletion failed, we still have a problem
//       if (!authError) {
//         return res.status(500).json({
//           success: false,
//           error: 'Failed to delete user profile',
//           details: profileError.message
//         });
//       }
//     }

//     // If both deletions failed, return error
//     if (authError && profileError) {
//       return res.status(500).json({
//         success: false,
//         error: 'Failed to delete user from both auth and profile tables',
//         details: {
//           authError: authError.message,
//           profileError: profileError.message
//         }
//       });
//     }

//     res.json({
//       success: true,
//       message: 'User deleted successfully'
//     });
//   } catch (error) {
//     console.error('Error in DELETE /admin/users/:userId:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Internal server error',
//       details: error.message 
//     });
//   }
// });

// /**
//  * POST /api/v1/admin/customers
//  * Create a customer for a white label tenant (Ali creates customers)
//  */
// router.post('/customers', validateAdminAccess, async (req, res) => {
//   try {
//     const { name, email, password, phone, countryCode, minutes_limit } = req.body;

//     if (!name || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         error: 'Name, email, and password are required'
//       });
//     }

//     // Only whitelabel admins (not main tenant admin) can create customers
//     const isMainTenantAdmin = req.userTenant === 'main' && req.userRole === 'admin' && !req.userSlug;
//     if (isMainTenantAdmin) {
//       return res.status(403).json({
//         success: false,
//         error: 'Main tenant admin cannot create customers directly. Use whitelabel tenant admin account.'
//       });
//     }

//     if (!req.userSlug) {
//       return res.status(403).json({
//         success: false,
//         error: 'Only white label tenant admins can create customers'
//       });
//     }

//     const supabase = getSupabaseClient();

//     // Validate minutes distribution if minutes_limit is provided
//     const customerMinutes = minutes_limit || 0;
//     if (customerMinutes > 0) {
//       const validation = await validateMinutesDistribution(
//         supabase,
//         req.userSlug,
//         req.userId,
//         customerMinutes,
//         null // New customer, no existing ID
//       );

//       if (!validation.valid) {
//         return res.status(400).json({
//           success: false,
//           error: validation.error,
//           details: {
//             adminMinutes: validation.adminMinutes,
//             currentTotal: validation.currentTotal,
//             requested: customerMinutes
//           }
//         });
//       }
//     }

//     // Create user in auth
//     const { data: authData, error: authError } = await supabase.auth.admin.createUser({
//       email,
//       password,
//       email_confirm: true, // Auto-confirm email
//       user_metadata: {
//         name,
//         contactPhone: phone,
//         countryCode: countryCode
//       }
//     });

//     if (authError) {
//       return res.status(400).json({
//         success: false,
//         error: authError.message
//       });
//     }

//     // Create user profile with tenant info
//     const { error: profileError } = await supabase
//       .from('users')
//       .insert({
//         id: authData.user.id,
//         name,
//         tenant: req.userSlug, // Customer belongs to white label tenant
//         role: 'user',
//         contact: {
//           email,
//           phone: phone || null,
//           countryCode: countryCode || null
//         },
//         minutes_limit: minutes_limit || 0,
//         minutes_used: 0
//       });

//     if (profileError) {
//       // Rollback: delete auth user if profile creation fails
//       await supabase.auth.admin.deleteUser(authData.user.id);
//       return res.status(500).json({
//         success: false,
//         error: 'Failed to create user profile',
//         details: profileError.message
//       });
//     }

//     res.json({
//       success: true,
//       message: 'Customer created successfully',
//       data: {
//         id: authData.user.id,
//         email: authData.user.email,
//         name,
//         tenant: req.userSlug
//       }
//     });
//   } catch (error) {
//     console.error('Error in POST /admin/customers:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Internal server error',
//       details: error.message
//     });
//   }
// });

// /**
//  * POST /api/v1/admin/customers/:customerId/minutes
//  * Distribute minutes to a customer (Ali distributes minutes to his customers)
//  */
// router.post('/customers/:customerId/minutes', validateAdminAccess, async (req, res) => {
//   try {
//     const { customerId } = req.params;
//     const { minutes_limit } = req.body;

//     if (!minutes_limit || minutes_limit < 0) {
//       return res.status(400).json({
//         success: false,
//         error: 'Valid minutes_limit is required'
//       });
//     }

//     // Only whitelabel admins can distribute minutes
//     const isMainTenantAdmin = req.userTenant === 'main' && req.userRole === 'admin' && !req.userSlug;
//     if (isMainTenantAdmin) {
//       return res.status(403).json({
//         success: false,
//         error: 'Main tenant admin cannot distribute minutes directly. Use whitelabel tenant admin account.'
//       });
//     }

//     if (!req.userSlug) {
//       return res.status(403).json({
//         success: false,
//         error: 'Only white label tenant admins can distribute minutes'
//       });
//     }

//     const supabase = getSupabaseClient();

//     // Verify customer belongs to this tenant
//     const { data: customer, error: customerError } = await supabase
//       .from('users')
//       .select('id, tenant, minutes_limit')
//       .eq('id', customerId)
//       .eq('tenant', req.userSlug)
//       .single();

//     if (customerError || !customer) {
//       return res.status(404).json({
//         success: false,
//         error: 'Customer not found or does not belong to your tenant'
//       });
//     }

//     // Validate minutes distribution
//     const validation = await validateMinutesDistribution(
//       supabase,
//       req.userSlug,
//       req.userId,
//       minutes_limit,
//       customerId // Existing customer being updated
//     );

//     if (!validation.valid) {
//       return res.status(400).json({
//         success: false,
//         error: validation.error,
//         details: {
//           adminMinutes: validation.adminMinutes,
//           currentTotal: validation.currentTotal,
//           requested: minutes_limit,
//           customerCurrentMinutes: customer.minutes_limit || 0
//         }
//       });
//     }

//     // Update customer's minutes
//     const { error: updateError } = await supabase
//       .from('users')
//       .update({ minutes_limit })
//       .eq('id', customerId);

//     if (updateError) {
//       return res.status(500).json({
//         success: false,
//         error: 'Failed to update minutes',
//         details: updateError.message
//       });
//     }

//     res.json({
//       success: true,
//       message: `Minutes updated to ${minutes_limit}`,
//       data: {
//         customerId,
//         minutes_limit
//       }
//     });
//   } catch (error) {
//     console.error('Error in POST /admin/customers/:customerId/minutes:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Internal server error',
//       details: error.message
//     });
//   }
// });

// export default router;



import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client with service role
const getSupabaseClient = () => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Middleware: Validate admin access
const validateAdminAccess = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, slug_name, tenant")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return res.status(403).json({ error: "User not found" });
    }

    if (userData.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = user;
    req.userId = user.id;
    req.userRole = userData.role;
    req.userSlug = userData.slug_name;
    req.userTenant = userData.tenant;

    next();
  } catch (error) {
    console.error("Error validating admin access:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET admin emails
 * (unchanged)
 */
router.get('/users/emails', validateAdminAccess, async (req, res) => {
  try {
    const { userIds } = req.query;

    if (!userIds) {
      return res.status(400).json({
        success: false,
        error: "userIds query parameter is required"
      });
    }

    const supabase = getSupabaseClient();
    const userIdArray = userIds.split(",").map(id => id.trim());

    const emailMap = {};

    await Promise.all(
      userIdArray.map(async (id) => {
        try {
          const { data } = await supabase.auth.admin.getUserById(id);
          if (data?.user?.email) {
            emailMap[id] = data.user.email;
          }
        } catch { }
      })
    );

    res.json({ success: true, data: emailMap });
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /admin/users
 * (unchanged — still merges auth + profile)
 */
router.get('/users', validateAdminAccess, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { search } = req.query;

    const { data: authList } = await supabase.auth.admin.listUsers();

    const authUsers = authList?.users || [];
    const userIds = authUsers.map(u => u.id);

    const { data: profiles } = await supabase
      .from("users")
      .select("*")
      .in("id", userIds);

    const merged = authUsers.map(user => {
      const profile = profiles?.find(p => p.id === user.id);

      return {
        id: user.id,
        email: user.email,
        name: profile?.name,
        role: profile?.role,
        is_active: profile?.is_active,
        created_on: profile?.created_on || user.created_at,
        tenant: profile?.tenant,
        slug_name: profile?.slug_name,
        company: profile?.company,
        industry: profile?.industry,
        contact: profile?.contact || {},
        email_confirmed: user.email_confirmed_at !== null,
        last_sign_in: user.last_sign_in_at,
        plan: profile?.plan
      };
    });

    let list = merged;

    if (search) {
      const term = search.toLowerCase();
      list = list.filter(u =>
        u.email?.toLowerCase().includes(term) ||
        u.name?.toLowerCase().includes(term) ||
        u.company?.toLowerCase().includes(term)
      );
    }

    res.json({ success: true, data: list, total: list.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * DELETE user
 */
router.delete('/users/:userId', validateAdminAccess, async (req, res) => {
  try {
    const { userId } = req.params;

    const supabase = getSupabaseClient();

    await supabase.auth.admin.deleteUser(userId);
    await supabase.from("users").delete().eq("id", userId);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /admin/customers
 * Create new customer under a whitelabel tenant
 * (MINUTES REMOVED)
 */
router.post('/customers', validateAdminAccess, async (req, res) => {
  try {
    const { name, email, password, phone, countryCode } = req.body;

    if (!req.userSlug) {
      return res.status(403).json({ success: false, error: "Only whitelabel admins can create customers" });
    }

    const supabase = getSupabaseClient();

    // Create user in auth
    const { data, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, countryCode }
    });

    if (authErr) return res.status(400).json({ success: false, error: authErr.message });

    // Create customer profile (NO minutes_limit)
    const { error: profileErr } = await supabase.from("users").insert({
      id: data.user.id,
      name,
      tenant: req.userSlug,
      role: "user",
      contact: {
        email,
        phone,
        countryCode
      }
    });

    if (profileErr) {
      await supabase.auth.admin.deleteUser(data.user.id);
      return res.status(500).json({ success: false, error: profileErr.message });
    }

    res.json({ success: true, message: "Customer created", data: { id: data.user.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * REMOVED:
 * POST /customers/:customerId/minutes
 * validateMinutesDistribution()
 * All minutes logic
 */

export default router;
