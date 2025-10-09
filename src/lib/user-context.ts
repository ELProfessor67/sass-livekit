/**
 * Utility functions for handling user context during impersonation
 */

/**
 * Get the current user ID - either impersonated user or authenticated user
 * This function checks localStorage for impersonation state and returns the appropriate user ID
 */
export function getCurrentUserId(): string | null {
  // Check if we're impersonating by looking at localStorage
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
