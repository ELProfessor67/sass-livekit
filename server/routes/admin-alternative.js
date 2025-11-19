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

// Middleware to validate admin access
const validateAdminAccess = async (req, res, next) => {
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

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Error validating admin access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * ALTERNATIVE APPROACH: GET /api/v1/admin/users/all
 * Fetch all users from auth.users first, then get details from users table
 * 
 * This is the alternative approach where we:
 * 1. Fetch from auth.users (source of truth for emails)
 * 2. Fetch user profiles from users table by matching IDs
 * 3. Merge and return complete user data
 */
router.get('/users/all', validateAdminAccess, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const supabase = getSupabaseClient();

    // Step 1: Fetch all users from auth.users
    // Note: listUsers() returns paginated results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers({
      page: pageNum,
      perPage: limitNum
    });

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users from auth system'
      });
    }

    const authUsers = authUsersData?.users || [];

    // If no users, return empty result
    if (authUsers.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0
        }
      });
    }

    // Step 2: Extract user IDs and fetch profiles from users table
    const userIds = authUsers.map(u => u.id);

    const { data: userProfiles, error: profilesError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      // Continue even if profiles fail - we'll use auth data only
    }

    // Step 3: Merge auth data with profile data
    const mergedUsers = authUsers.map(authUser => {
      // Find matching profile
      const profile = userProfiles?.find(p => p.id === authUser.id) || null;

      // Build user object with email from auth and profile data
      const user = {
        id: authUser.id,
        email: authUser.email, // Always from auth.users (source of truth)
        name: profile?.name || authUser.user_metadata?.name || null,
        role: profile?.role || 'user',
        is_active: profile?.is_active ?? true,
        company: profile?.company || null,
        industry: profile?.industry || null,
        created_on: profile?.created_on || authUser.created_at,
        updated_at: profile?.updated_at || authUser.updated_at,
        contact: {
          email: authUser.email, // Primary email from auth
          phone: profile?.contact?.phone || authUser.user_metadata?.phone || null,
          countryCode: profile?.contact?.countryCode || authUser.user_metadata?.countryCode || null,
        },
        // Include auth metadata
        email_confirmed: authUser.email_confirmed_at !== null,
        last_sign_in: authUser.last_sign_in_at,
        // Include profile data if available
        plan: profile?.plan || null,
        onboarding_completed: profile?.onboarding_completed || null,
      };

      return user;
    });

    // Step 4: Apply search filter if provided
    let filteredUsers = mergedUsers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = mergedUsers.filter(user =>
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.company?.toLowerCase().includes(searchLower)
      );
    }

    // Step 5: Sort by created date (newest first)
    filteredUsers.sort((a, b) => {
      const dateA = new Date(a.created_on || 0).getTime();
      const dateB = new Date(b.created_on || 0).getTime();
      return dateB - dateA;
    });

    res.json({
      success: true,
      data: filteredUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: authUsersData?.total || filteredUsers.length,
        totalPages: Math.ceil((authUsersData?.total || filteredUsers.length) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in GET /admin/users/all:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * HYBRID APPROACH: GET /api/v1/admin/users/complete
 * Best of both worlds - fetch from users table, enrich with emails from auth
 * 
 * This approach:
 * 1. Fetches from users table (primary source for profile data)
 * 2. Fetches emails from auth.users in the same request
 * 3. Returns merged data in one response
 */
router.get('/users/complete', validateAdminAccess, async (req, res) => {
  try {
    const supabase = getSupabaseClient();

    // Step 1: Fetch all users from users table (has profile data)
    const { data: userProfiles, error: profilesError } = await supabase
      .from('users')
      .select('*')
      .order('created_on', { ascending: false });

    if (profilesError) {
      throw profilesError;
    }

    if (!userProfiles || userProfiles.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Step 2: Fetch emails from auth.users for all user IDs
    const userIds = userProfiles.map(u => u.id);
    const emailMap = {};

    // Fetch emails in batches to avoid overwhelming the API
    const batchSize = 50;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (userId) => {
          try {
            const { data, error } = await supabase.auth.admin.getUserById(userId);
            if (!error && data?.user?.email) {
              emailMap[userId] = data.user.email;
            }
          } catch (err) {
            console.warn(`Could not fetch email for user ${userId}:`, err);
          }
        })
      );
    }

    // Step 3: Merge emails into user profiles
    const completeUsers = userProfiles.map(profile => {
      const email = emailMap[profile.id];
      return {
        ...profile,
        contact: {
          ...profile.contact,
          email: email || profile.contact?.email || null
        }
      };
    });

    res.json({
      success: true,
      data: completeUsers
    });
  } catch (error) {
    console.error('Error in GET /admin/users/complete:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;



