import { useEffect, useState } from "react";
import { authService, AuthState, AuthUser, UserProfile, SignUpMetadata } from "@/lib/auth";

/**
 * React hook that provides access to the centralized auth service
 * This hook subscribes to auth state changes and provides reactive updates
 */
export function useAuthService() {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(setAuthState);
    
    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return {
    // Auth state
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,

    // Auth methods
    signIn: authService.signIn.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService),
    updateProfile: authService.updateProfile.bind(authService),
    refreshProfile: authService.refreshProfile.bind(authService),

    // Utility methods
    getUserDisplayName: authService.getUserDisplayName.bind(authService),
    getUserInitials: authService.getUserInitials.bind(authService),
    hasCompletedOnboarding: authService.hasCompletedOnboarding.bind(authService),
    isTrialActive: authService.isTrialActive.bind(authService),
    getDaysUntilTrialEnds: authService.getDaysUntilTrialEnds.bind(authService),
  };
}

/**
 * Hook that provides only the current user data
 * Useful when you only need user information without auth methods
 */
export function useCurrentUser(): AuthUser | null {
  const { user } = useAuthService();
  return user;
}

/**
 * Hook that provides authentication status
 * Useful for conditional rendering based on auth state
 */
export function useAuthStatus() {
  const { isAuthenticated, isLoading } = useAuthService();
  return { isAuthenticated, isLoading };
}

/**
 * Hook that provides user profile utilities
 * Useful for profile-related operations
 */
export function useUserProfile() {
  const { user, updateProfile, refreshProfile } = useAuthService();
  
  return {
    profile: user,
    updateProfile,
    refreshProfile,
    getUserDisplayName: () => user?.fullName || user?.email || 'User',
    getUserInitials: () => {
      if (user?.fullName) {
        return user.fullName
          .split(' ')
          .map(name => name.charAt(0))
          .join('')
          .toUpperCase()
          .slice(0, 2);
      }
      if (user?.email) {
        return user.email.charAt(0).toUpperCase();
      }
      return 'U';
    },
    hasCompletedOnboarding: () => Boolean(user?.onboardingCompleted),
    isTrialActive: () => {
      if (!user?.trialEndsAt) return false;
      return new Date(user.trialEndsAt) > new Date();
    },
    getDaysUntilTrialEnds: () => {
      if (!user?.trialEndsAt) return 0;
      const trialEnd = new Date(user.trialEndsAt);
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
  };
}

// Re-export types for convenience
export type { AuthUser, UserProfile, SignUpMetadata, AuthState } from "@/lib/auth";
