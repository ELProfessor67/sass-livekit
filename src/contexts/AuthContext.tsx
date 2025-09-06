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

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
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
          await loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: any) => {
    try {
      console.log('Loading user profile for:', authUser.email);
      
      // Skip database operations entirely for now to prevent hanging
      console.log('Skipping database operations, using basic profile');
      
      // Just use the basic user data from auth
      const basicUser = {
        id: authUser.id,
        email: authUser.email,
        fullName: (authUser.user_metadata as any)?.name || null,
        phone: (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
        countryCode: (authUser.user_metadata as any)?.countryCode || null,
      };
      
      console.log('Using basic user profile:', basicUser);
      setUser(basicUser);
    } catch (error) {
      console.error("Error loading user profile:", error);
      const fallbackUser = {
        id: authUser.id,
        email: authUser.email,
        fullName: (authUser.user_metadata as any)?.name || null,
        phone: (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
        countryCode: (authUser.user_metadata as any)?.countryCode || null,
      };
      console.log('Using fallback user profile:', fallbackUser);
      setUser(fallbackUser);
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
        const basicUser = {
          id: data.user.id,
          email: data.user.email,
          fullName: (data.user.user_metadata as any)?.name || null,
          phone: (data.user.user_metadata as any)?.contactPhone || (data.user.user_metadata as any)?.phone || null,
          countryCode: (data.user.user_metadata as any)?.countryCode || null,
        };
        setUser(basicUser);
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

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
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
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
