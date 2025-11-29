import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TwilioCredentialsService } from '@/lib/twilio-credentials';
import { supabaseWithRetry } from '@/lib/supabase-retry';
import { SupportAccessService } from '@/lib/supportAccessService';

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

interface SupportAccessSession {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  reason: string;
  duration_minutes: number;
  scoped_token: string;
  status: 'active' | 'expired' | 'revoked' | 'completed';
  expires_at: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
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
  // Support Access functions
  startSupportAccess: (sessionData: any) => Promise<{ success: boolean; message: string }>;
  endSupportAccess: () => Promise<void>;
  activeSupportSession: SupportAccessSession | null;
  validateScopedToken: (token: string) => Promise<boolean>;
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
  const [activeSupportSession, setActiveSupportSession] = useState<SupportAccessSession | null>(null);
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null);
  
  const supportAccessService = SupportAccessService.getInstance();

  useEffect(() => {
    let mounted = true;
    let isFetching = false;

    const fetchUserAndProfile = async () => {
      if (!mounted || isFetching) return;
      
      isFetching = true;
      
      try {
        // Check for support access session first
        const supportSessionData = localStorage.getItem('support_access_session');
        if (supportSessionData) {
          try {
            const parsed = JSON.parse(supportSessionData);
            const session = parsed.session;
            const scopedToken = parsed.scopedToken;
            
            // Validate the scoped token
            const validation = await supportAccessService.validateScopedToken(scopedToken);
            if (validation.is_valid && validation.target_user_id) {
              console.log('Restoring support access session:', session);
              
              // Load the target user data
              const targetUserData = await supportAccessService.getUserForScopedAccess(validation.target_user_id);
              if (targetUserData) {
                const impersonatedUser: User = {
                  id: targetUserData.id,
                  email: targetUserData.contact?.email || null,
                  fullName: targetUserData.name,
                  phone: targetUserData.contact?.phone || null,
                  countryCode: targetUserData.contact?.countryCode || null,
                  role: targetUserData.role || null,
                  isActive: targetUserData.is_active,
                  company: targetUserData.company,
                  industry: targetUserData.industry,
                  createdAt: targetUserData.created_on,
                  updatedAt: targetUserData.updated_at,
                };
                
                setActiveSupportSession(session);
                setIsImpersonating(true);
                setUser(impersonatedUser);
                setLoading(false);
                return;
              }
            } else {
              // Token is invalid, clean up
              localStorage.removeItem('support_access_session');
            }
          } catch (error) {
            console.error('Error restoring support access session:', error);
            localStorage.removeItem('support_access_session');
          }
        }

        // Check for regular impersonation
        const impersonationData = localStorage.getItem('impersonation');
        if (impersonationData) {
          try {
            const parsed = JSON.parse(impersonationData);
            if (parsed.isImpersonating && parsed.originalUserId && parsed.impersonatedUserData) {
              console.log('Restoring impersonation state:', parsed.impersonatedUserData);
              setOriginalUser({
                id: parsed.originalUserId,
                email: null, // Will be loaded from auth
                fullName: null,
                phone: null,
                countryCode: null,
                role: 'admin',
                isActive: true,
                company: null,
                industry: null,
              });
              setIsImpersonating(true);
              setUser(parsed.impersonatedUserData);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Error restoring impersonation state:', error);
            localStorage.removeItem('impersonation');
          }
        }

        // Get the current user from auth server
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
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
          setActiveSupportSession(null);
          setLastFetchedUserId(null);
          localStorage.removeItem('impersonation');
          localStorage.removeItem('support_access_session');
          // Clear user profile cache
          if (lastFetchedUserId) {
            localStorage.removeItem(`user_profile_${lastFetchedUserId}`);
          }
          setLoading(false);
        } else if (event === 'INITIAL_SESSION' && session?.user) {
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
  }, []);

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
      
      // Create user object from auth metadata
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
      
      // Set user immediately from auth data
      console.log('Loaded user profile from auth metadata:', userFromAuth);
      setUser(userFromAuth);
      setLoading(false);
      
      // Cache the user data
      localStorage.setItem(cacheKey, JSON.stringify({
        user: userFromAuth,
        timestamp: Date.now()
      }));
      
      // Optionally fetch extended profile data in background
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
      
      return { success: true, message: 'Sign in successful' };
    } catch (error) {
      console.error('AuthContext: Sign in error:', error);
      return { success: false, message: 'An error occurred during sign in' };
    }
  };

  const signUp = async (name: string, email: string, password: string, metadata?: { phone?: string; countryCode?: string }) => {
    try {
      // Get the site URL from environment variable or use current origin
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      const redirectTo = `${siteUrl}/auth/callback`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: redirectTo,
          email_confirm: true, // Auto-confirm email, skip verification
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

      // Email is auto-confirmed, user can login immediately
      return { success: true, message: 'Sign up successful! You can now login.' };
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
      setActiveSupportSession(null);

      // Clear impersonation state from localStorage
      localStorage.removeItem('impersonation');
      localStorage.removeItem('support_access_session');
    } catch (error) {
      console.error('Exit impersonation error:', error);
    }
  };

  // Support Access functions
  const startSupportAccess = async (sessionData: any) => {
    try {
      const { session, token } = sessionData;
      
      // Validate the scoped token
      const validation = await supportAccessService.validateScopedToken(token);
      if (!validation.is_valid) {
        return { success: false, message: 'Invalid or expired support access token' };
      }

      // Get the target user data
      const targetUserData = await supportAccessService.getUserForScopedAccess(session.target_user_id);
      if (!targetUserData) {
        return { success: false, message: 'Target user not found' };
      }

      // Create impersonated user object
      const impersonatedUser: User = {
        id: targetUserData.id,
        email: targetUserData.contact?.email || null,
        fullName: targetUserData.name,
        phone: targetUserData.contact?.phone || null,
        countryCode: targetUserData.contact?.countryCode || null,
        role: targetUserData.role || null,
        isActive: targetUserData.is_active,
        company: targetUserData.company,
        industry: targetUserData.industry,
        createdAt: targetUserData.created_on,
        updatedAt: targetUserData.updated_at,
      };

      // Store support access session in localStorage
      localStorage.setItem('support_access_session', JSON.stringify({
        session,
        scopedToken: token,
        impersonatedUserData: impersonatedUser
      }));

      // Set the impersonated user and session
      setUser(impersonatedUser);
      setActiveSupportSession(session);
      setIsImpersonating(true);

      return { success: true, message: `Support access granted for ${impersonatedUser.fullName || impersonatedUser.email}` };
    } catch (error) {
      console.error('Support access error:', error);
      return { success: false, message: 'Failed to start support access' };
    }
  };

  const endSupportAccess = async () => {
    try {
      if (!activeSupportSession) {
        return;
      }

      // End the support session
      await supportAccessService.endSupportSession(activeSupportSession.id, user?.id || '', 'completed');

      // Clear support access state
      setActiveSupportSession(null);
      setIsImpersonating(false);
      setOriginalUser(null);
      localStorage.removeItem('support_access_session');
      localStorage.removeItem('impersonation');

      // Reload the current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await loadUserProfile(authUser);
      }
    } catch (error) {
      console.error('Error ending support access:', error);
    }
  };

  const validateScopedToken = async (token: string): Promise<boolean> => {
    try {
      const validation = await supportAccessService.validateScopedToken(token);
      return validation.is_valid;
    } catch (error) {
      console.error('Error validating scoped token:', error);
      return false;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsImpersonating(false);
      setOriginalUser(null);
      setActiveSupportSession(null);
      localStorage.removeItem('impersonation');
      localStorage.removeItem('support_access_session');
      
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
    originalUser,
    startSupportAccess,
    endSupportAccess,
    activeSupportSession,
    validateScopedToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
