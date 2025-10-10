import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

    const fetchUserAndProfile = async () => {
      if (!mounted) return;
      
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
            if (prev !== session.user.id) {
              console.log('New user signed in, fetching profile for:', session.user.id);
              fetchUserAndProfile();
              return session.user.id;
            } else {
              console.log('Same user already fetched, skipping profile fetch');
              return prev;
            }
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsImpersonating(false);
          setOriginalUser(null);
          setLastFetchedUserId(null);
          localStorage.removeItem('impersonation');
          setLoading(false);
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          // Only fetch on initial session if we haven't fetched this user yet
          setLastFetchedUserId(prev => {
            if (prev !== session.user.id) {
              console.log('Initial session, fetching profile for:', session.user.id);
              fetchUserAndProfile();
              return session.user.id;
            }
            return prev;
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
      
      // Use Supabase client to fetch user data from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to basic user data from auth metadata
        const basicUser = {
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
        setUser(basicUser);
        setLoading(false);
        return;
      }

      // Use database data if available, otherwise fallback to auth metadata
      const user = {
        id: authUser.id,
        email: authUser.email,
        fullName: userData?.name || (authUser.user_metadata as any)?.name || null,
        phone: (userData?.contact as any)?.phone || (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
        countryCode: (userData?.contact as any)?.countryCode || (authUser.user_metadata as any)?.countryCode || null,
        role: (userData as any)?.role || null,
        isActive: userData?.is_active ?? true,
        company: (userData as any)?.company || null,
        industry: (userData as any)?.industry || null,
        createdAt: userData?.created_on || null,
        updatedAt: userData?.updated_at || null,
      };
      
      console.log('Loaded user profile:', user);
      setUser(user);
      setLoading(false);
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

      // Get the target user's data using Supabase client
      const { data: targetUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

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
        id: targetUser.id,
        email: (targetUser.contact as any)?.email || null,
        fullName: targetUser.name,
        phone: (targetUser.contact as any)?.phone || null,
        countryCode: (targetUser.contact as any)?.countryCode || null,
        role: (targetUser as any).role || null,
        isActive: targetUser.is_active,
        company: (targetUser as any).company,
        industry: (targetUser as any).industry,
        createdAt: targetUser.created_on,
        updatedAt: targetUser.updated_at,
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
