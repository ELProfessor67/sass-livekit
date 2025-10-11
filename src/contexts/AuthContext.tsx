import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TwilioCredentialsService } from '@/lib/twilio-credentials';
import { supabaseWithRetry } from '@/lib/supabase-retry';

interface User {
  id: string;
  email: string | null;
  fullName: string | null;
  phone?: string | null;
  countryCode?: string | null;
  company?: string | null;
  industry?: string | null;
  teamSize?: string | null;
  role?: string | null;
  useCase?: string | null;
  theme?: string | null;
  notifications?: boolean | null;
  goals?: any | null;
  onboardingCompleted?: boolean | null;
  plan?: string | null;
  trialEndsAt?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signUp: (name: string, email: string, password: string, metadata?: { phone?: string; countryCode?: string }) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  // Impersonation functions
  impersonateUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  exitImpersonation: () => Promise<void>;
  isImpersonating: boolean;
  originalUser: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let isFetching = false; // Add flag to prevent concurrent fetches

    const fetchUserAndProfile = async () => {
      if (!mounted || isFetching) return;
      
      isFetching = true;
      
      try {
        // Get the current user from auth server (more reliable than getSession)
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error getting user:', userError);
          setUser(null);
          setLoading(false);
          return;
        }

        if (!authUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Check for existing impersonation state FIRST
        const impersonationData = localStorage.getItem('impersonation');
        if (impersonationData) {
          try {
            const parsed = JSON.parse(impersonationData);
            if (parsed.isImpersonating && parsed.originalUserId === authUser.id && parsed.impersonatedUserData) {
              console.log('Restoring impersonation state:', parsed.impersonatedUserData);
              // Restore impersonation state directly
              setOriginalUser({
                id: authUser.id,
                email: authUser.email,
                fullName: (authUser.user_metadata as any)?.name || null,
                phone: (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
                countryCode: (authUser.user_metadata as any)?.countryCode || null,
                role: null,
                isActive: true,
                company: null,
                industry: null,
              });
              setIsImpersonating(true);
              setUser(parsed.impersonatedUserData);
              setLoading(false);
              return; // Skip normal profile loading
            }
          } catch (error) {
            console.error('Error restoring impersonation state:', error);
            localStorage.removeItem('impersonation');
          }
        }
        
        // Load profile if not impersonating
        await loadUserProfile(authUser);
        setLastFetchedUserId(authUser.id);
      } catch (error) {
        console.error('Error in fetchUserAndProfile:', error);
        setUser(null);
        setLoading(false);
      } finally {
        isFetching = false;
      }
    };

    // Initial fetch
    fetchUserAndProfile();

    // Listen for auth changes - but only on specific events to avoid loops
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Only fetch if this is a different user than we last fetched
          setLastFetchedUserId(prev => {
            if (prev !== session.user.id && !isFetching) {
              console.log('New user signed in, fetching profile for:', session.user.id);
              fetchUserAndProfile();
              return session.user.id;
            } else {
              console.log('Same user already fetched or currently fetching, skipping profile fetch');
              return prev;
            }
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsImpersonating(false);
          setOriginalUser(null);
          setLastFetchedUserId(null);
          localStorage.removeItem('impersonation');
          // Clear user profile cache
          if (lastFetchedUserId) {
            localStorage.removeItem(`user_profile_${lastFetchedUserId}`);
          }
          setLoading(false);
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          // Only fetch on initial session if we haven't fetched this user yet
          setLastFetchedUserId(prev => {
            if (prev !== session.user.id && !isFetching) {
              console.log('Initial session, fetching profile for:', session.user.id);
              fetchUserAndProfile();
              return session.user.id;
            } else {
              console.log('Same user already fetched or currently fetching, skipping profile fetch');
              return prev;
            }
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  const loadUserProfile = async (authUser: any) => {
    try {
      console.log('Loading user profile for:', authUser.email);
      
      // Check localStorage first for cached user data
      const cacheKey = `user_profile_${authUser.id}`;
      const cachedUserData = localStorage.getItem(cacheKey);
      
      if (cachedUserData) {
        try {
          const parsedData = JSON.parse(cachedUserData);
          const cacheAge = Date.now() - parsedData.timestamp;
          const maxAge = 30 * 60 * 1000; // 30 minutes cache
          
          if (cacheAge < maxAge) {
            console.log('Using cached user profile');
            setUser(parsedData.user);
            setLoading(false);
            return;
          } else {
            console.log('Cache expired, fetching fresh data');
            localStorage.removeItem(cacheKey);
          }
        } catch (error) {
          console.warn('Invalid cached user data, fetching fresh data');
          localStorage.removeItem(cacheKey);
        }
      }
      
      // Create user object from auth metadata (instant, no database call)
      const userFromAuth = {
        id: authUser.id,
        email: authUser.email,
        fullName: (authUser.user_metadata as any)?.name || authUser.email.split('@')[0],
        phone: (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
        countryCode: (authUser.user_metadata as any)?.countryCode || null,
        role: (authUser.user_metadata as any)?.role || 'user',
        isActive: true,
        company: (authUser.user_metadata as any)?.company || null,
        industry: (authUser.user_metadata as any)?.industry || null,
        createdAt: authUser.created_at || null,
        updatedAt: authUser.updated_at || null,
      };
      
      // Set user immediately from auth data (no loading delay)
      console.log('Loaded user profile from auth metadata:', userFromAuth);
      setUser(userFromAuth);
      setLoading(false);
      
      // Cache the user data
      localStorage.setItem(cacheKey, JSON.stringify({
        user: userFromAuth,
        timestamp: Date.now()
      }));
      
      // Optionally fetch extended profile data in background (non-blocking)
      try {
        const { data: userData, error } = await supabaseWithRetry(async () => {
          const result = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
          return result;
        });

        if (!error && userData) {
          // Update with database data if available
          const enhancedUser = {
            ...userFromAuth,
            fullName: (userData as any).name || userFromAuth.fullName,
            phone: ((userData as any).contact as any)?.phone || userFromAuth.phone,
            countryCode: ((userData as any).contact as any)?.countryCode || userFromAuth.countryCode,
            role: (userData as any)?.role || userFromAuth.role,
            company: (userData as any)?.company || userFromAuth.company,
            industry: (userData as any)?.industry || userFromAuth.industry,
            createdAt: (userData as any).created_on || userFromAuth.createdAt,
            updatedAt: (userData as any).updated_at || userFromAuth.updatedAt,
          };
          
          console.log('Enhanced user profile with database data:', enhancedUser);
          setUser(enhancedUser);
          
          // Update cache with enhanced data
          localStorage.setItem(cacheKey, JSON.stringify({
            user: enhancedUser,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.warn('Background profile enhancement failed (non-critical):', error);
        // Don't throw - we already have user data from auth
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      // Final fallback
      const fallbackUser = {
        id: authUser.id,
        email: authUser.email,
        fullName: (authUser.user_metadata as any)?.name || null,
        phone: (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
        countryCode: (authUser.user_metadata as any)?.countryCode || null,
        role: null,
        isActive: true,
        company: null,
        industry: null,
      };
      console.log('Using fallback user profile:', fallbackUser);
      setUser(fallbackUser);
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Starting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.log('AuthContext: Sign in error:', error.message);
        return { success: false, message: error.message };
      }
      
      console.log('AuthContext: Supabase auth successful, user:', data.user?.email);
      
      // Set onboarding as completed in localStorage to prevent redirect
      localStorage.setItem("onboarding-completed", "true");
      
      // The auth state change listener will handle loading the user profile
      console.log('AuthContext: Sign in successful, auth state change will handle profile loading');
      
      return { success: true, message: 'Sign in successful' };
    } catch (error) {
      console.error('AuthContext: Sign in error:', error);
      return { success: false, message: 'An error occurred during sign in' };
    }
  };

  const signUp = async (name: string, email: string, password: string, metadata?: { phone?: string; countryCode?: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            name, 
            contactPhone: metadata?.phone, 
            countryCode: metadata?.countryCode 
          } 
        },
      });
      
      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Sign up successful' };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, message: 'An error occurred during sign up' };
    }
  };

  const impersonateUser = async (userId: string) => {
    try {
      // Check if current user is admin
      if (!user || user.role !== 'admin') {
        return { success: false, message: 'Only admins can impersonate users' };
      }

      console.log('Starting impersonation for user ID:', userId);

      // Store original user immediately
      setOriginalUser(user);
      setIsImpersonating(true);

      // Get the target user's data using Supabase client with retry
      const { data: targetUser, error: fetchError } = await supabaseWithRetry(async () => {
        const result = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        return result;
      });

      if (fetchError) {
        console.error('Error fetching target user:', fetchError);
        setIsImpersonating(false);
        setOriginalUser(null);
        return { success: false, message: 'Failed to fetch user data' };
      }

      // Check if target user is admin (prevent admin impersonation)
      if ((targetUser as any).role === 'admin') {
        setIsImpersonating(false);
        setOriginalUser(null);
        return { success: false, message: 'Cannot impersonate admin users' };
      }

      // Create impersonated user object
      const impersonatedUser: User = {
        id: (targetUser as any).id,
        email: ((targetUser as any).contact as any)?.email || null,
        fullName: (targetUser as any).name,
        phone: ((targetUser as any).contact as any)?.phone || null,
        countryCode: ((targetUser as any).contact as any)?.countryCode || null,
        role: (targetUser as any).role || null,
        isActive: (targetUser as any).is_active,
        company: (targetUser as any).company,
        industry: (targetUser as any).industry,
        createdAt: (targetUser as any).created_on,
        updatedAt: (targetUser as any).updated_at,
      };

      console.log('Setting impersonated user:', impersonatedUser);

      // Store impersonation state in localStorage FIRST
      localStorage.setItem('impersonation', JSON.stringify({
        isImpersonating: true,
        originalUserId: user.id,
        targetUserId: userId,
        impersonatedUserData: impersonatedUser
      }));

      // Set the impersonated user AFTER localStorage is set
      setUser(impersonatedUser);

      return { success: true, message: `Now impersonating ${impersonatedUser.fullName || impersonatedUser.email}` };
    } catch (error) {
      console.error('Impersonation error:', error);
      setIsImpersonating(false);
      setOriginalUser(null);
      return { success: false, message: 'Failed to impersonate user' };
    }
  };

  const exitImpersonation = async () => {
    try {
      if (!isImpersonating || !originalUser) {
        return;
      }

      // Restore original user
      setUser(originalUser);
      setIsImpersonating(false);
      setOriginalUser(null);

      // Clear impersonation state from localStorage
      localStorage.removeItem('impersonation');
    } catch (error) {
      console.error('Exit impersonation error:', error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsImpersonating(false);
      setOriginalUser(null);
      localStorage.removeItem('impersonation');
      
      // Clear Twilio credentials cache when user logs out
      TwilioCredentialsService.clearUserCache();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      // Use Supabase client to update user profile
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return;
      }

      // Reload user profile
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await loadUserProfile(authUser);
      }
    } catch (error) {
      console.error('Update profile error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    impersonateUser,
    exitImpersonation,
    isImpersonating,
    originalUser
  };

  // console.log('AuthProvider: Rendering with user:', user?.email, 'loading:', loading, 'isImpersonating:', isImpersonating);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
