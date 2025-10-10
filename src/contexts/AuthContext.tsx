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

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Check for existing impersonation state FIRST
          const impersonationData = localStorage.getItem('impersonation');
          if (impersonationData) {
            try {
              const parsed = JSON.parse(impersonationData);
              if (parsed.isImpersonating && parsed.originalUserId === session.user.id && parsed.impersonatedUserData) {
                console.log('Restoring impersonation state:', parsed.impersonatedUserData);
                // Restore impersonation state directly
                setOriginalUser({
                  id: session.user.id,
                  email: session.user.email,
                  fullName: (session.user.user_metadata as any)?.name || null,
                  phone: (session.user.user_metadata as any)?.contactPhone || (session.user.user_metadata as any)?.phone || null,
                  countryCode: (session.user.user_metadata as any)?.countryCode || null,
                  role: 'admin',
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
          
          // Only load profile if not impersonating
          await loadUserProfile(session.user);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if we're currently impersonating before loading profile
          const impersonationData = localStorage.getItem('impersonation');
          let isCurrentlyImpersonating = false;
          
          if (impersonationData) {
            try {
              const parsed = JSON.parse(impersonationData);
              isCurrentlyImpersonating = parsed.isImpersonating === true;
            } catch (error) {
              console.error('Error parsing impersonation data in auth listener:', error);
              localStorage.removeItem('impersonation');
            }
          }
          
          if (!isCurrentlyImpersonating) {
            console.log('Not impersonating, loading profile for:', session.user.email);
            await loadUserProfile(session.user);
          } else {
            console.log('Currently impersonating, skipping profile load in auth listener');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsImpersonating(false);
          setOriginalUser(null);
          localStorage.removeItem('impersonation');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: any) => {
    try {
      console.log('Loading user profile for:', authUser.email);
      
      // Fetch user profile from database to get the actual role
      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to basic auth user data with default role
        const fallbackUser = {
          id: authUser.id,
          email: authUser.email,
          fullName: (authUser.user_metadata as any)?.name || null,
          phone: (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
          countryCode: (authUser.user_metadata as any)?.countryCode || null,
          role: 'user', // Default role
          isActive: true,
          company: null,
          industry: null,
        };
        console.log('Using fallback user profile:', fallbackUser);
        setUser(fallbackUser);
        setLoading(false);
        return;
      }

      // Use the actual profile data from database
      const user: User = {
        id: authUser.id,
        email: authUser.email,
        fullName: profile?.name || (authUser.user_metadata as any)?.name || null,
        phone: profile?.contact?.phone || (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
        countryCode: profile?.contact?.countryCode || (authUser.user_metadata as any)?.countryCode || null,
        company: profile?.company || null,
        industry: profile?.industry || null,
        teamSize: profile?.team_size || null,
        role: profile?.role || 'user', // Use actual role from database
        useCase: profile?.use_case || null,
        theme: profile?.theme || null,
        notifications: profile?.notifications || null,
        goals: profile?.goals || null,
        onboardingCompleted: profile?.onboarding_completed || null,
        plan: profile?.plan || null,
        trialEndsAt: profile?.trial_ends_at || null,
        isActive: profile?.is_active || true,
        createdAt: profile?.created_at || null,
        updatedAt: profile?.updated_at || null,
      };

      console.log('Loaded user profile from database:', user);
      setUser(user);
      setLoading(false);
    } catch (error) {
      console.error("Error loading user profile:", error);
      const fallbackUser = {
        id: authUser.id,
        email: authUser.email,
        fullName: (authUser.user_metadata as any)?.name || null,
        phone: (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
        countryCode: (authUser.user_metadata as any)?.countryCode || null,
        role: 'user', // Default role
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
      
      // If we have a session, set basic user data immediately
      if (data.user) {
        console.log('AuthContext: Setting basic user data immediately...');
        
        // Set basic user data immediately to unblock the UI
        const adminUserIds = ['7a0187a4-a2b7-4df7-bf92-bf6da1e26846']; // Add more admin IDs here
        const userRole = adminUserIds.includes(data.user.id) ? 'admin' : 'user';
        
        const basicUser = {
          id: data.user.id,
          email: data.user.email,
          fullName: (data.user.user_metadata as any)?.name || null,
          phone: (data.user.user_metadata as any)?.contactPhone || (data.user.user_metadata as any)?.phone || null,
          countryCode: (data.user.user_metadata as any)?.countryCode || null,
          role: userRole,
          isActive: true,
          company: null,
          industry: null,
        };
        setUser(basicUser);
        setLoading(false); // Stop loading immediately
        console.log('AuthContext: Basic user data set, login complete');
        
        // Set onboarding as completed in localStorage to prevent redirect
        localStorage.setItem("onboarding-completed", "true");
        
        // Load full profile in background (completely async, no blocking)
        setTimeout(() => {
          console.log('AuthContext: Loading full profile in background...');
          loadUserProfile(data.user).catch(error => {
            console.warn('AuthContext: Background profile loading failed:', error);
          });
        }, 100);
      }
      
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

      // Get the target user's data
      const { data: targetUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching target user:', error);
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
        role: (targetUser as any).role || 'user',
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
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

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

  console.log('AuthProvider: Rendering with user:', user?.email, 'loading:', loading, 'isImpersonating:', isImpersonating);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
