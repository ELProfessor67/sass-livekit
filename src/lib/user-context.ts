/**
 * Utility functions for handling user context during impersonation
 */

/**
 * Get the current user ID - either impersonated user or authenticated user
 * This function checks localStorage for impersonation state and support access sessions
 */
export function getCurrentUserId(): string | null {
  // First check for support access session
  const supportSessionData = localStorage.getItem('support_access_session');
  if (supportSessionData) {
    try {
      const parsed = JSON.parse(supportSessionData);
      if (parsed.impersonatedUserData && parsed.impersonatedUserData.id) {
        console.log('Using support access user ID:', parsed.impersonatedUserData.id);
        return parsed.impersonatedUserData.id;
      }
    } catch (error) {
      console.error('Error parsing support access session data in getCurrentUserId:', error);
      localStorage.removeItem('support_access_session');
    }
  }

  // Then check for regular impersonation
  const impersonationData = localStorage.getItem('impersonation');
  if (impersonationData) {
    try {
      const parsed = JSON.parse(impersonationData);
      if (parsed.isImpersonating && parsed.impersonatedUserData) {
        console.log('Using impersonated user ID:', parsed.impersonatedUserData.id);
        return parsed.impersonatedUserData.id;
      }
    } catch (error) {
      console.error('Error parsing impersonation data in getCurrentUserId:', error);
      localStorage.removeItem('impersonation');
    }
  }

  return null; // Will need to fallback to authenticated user
}

/**
 * Get the current user ID with fallback to authenticated user
 * This is an async version that can fetch from Supabase auth if needed
 */
export async function getCurrentUserIdAsync(): Promise<string> {
  const impersonatedUserId = getCurrentUserId();
  if (impersonatedUserId) {
    return impersonatedUserId;
  }
  
  // Fallback to authenticated user
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  console.log('Using authenticated user ID:', user.id);
  return user.id;
}
