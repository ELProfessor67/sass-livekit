import { supabase } from "@/integrations/supabase/client";
import { extractTenantFromHostname } from "@/lib/tenant-utils";

// Enhanced user interface with all available data
export interface AuthUser {
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

// Contact information interface
export interface ContactInfo {
  email: string | null;
  phone: string | null;
  countryCode: string | null;
}

// User profile interface for database operations
export interface UserProfile {
  id: string;
  name?: string | null;
  company?: string | null;
  industry?: string | null;
  team_size?: string | null;
  role?: string | null;
  use_case?: string | null;
  theme?: string | null;
  notifications?: boolean | null;
  goals?: any | null;
  onboarding_completed?: boolean | null;
  plan?: string | null;
  trial_ends_at?: string | null;
  contact?: ContactInfo | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Auth state interface
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Sign up metadata interface
export interface SignUpMetadata {
  phone?: string;
  countryCode?: string;
}

// Auth utility class
export class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  };
  private listeners: Set<(state: AuthState) => void> = new Set();

  private constructor() {
    this.initializeAuth();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize auth state and listen for changes
  private async initializeAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await this.loadUserProfile(user);
      } else {
        this.updateAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      this.updateAuthState({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Authentication error' 
      });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await this.loadUserProfile(session.user);
      } else {
        this.updateAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    });
  }

  // Load user profile from database
  private async loadUserProfile(authUser: any) {
    try {
      // Ensure user exists in public.users table
      await this.ensureUserProfile(authUser);

      // Fetch complete user profile
      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to basic auth user data
        this.updateAuthState({
          user: this.mapAuthUserToUser(authUser),
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      const user: AuthUser = {
        id: authUser.id,
        email: authUser.email,
        fullName: profile?.name || (authUser.user_metadata as any)?.name || null,
        phone: profile?.contact?.phone || (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
        countryCode: profile?.contact?.countryCode || (authUser.user_metadata as any)?.countryCode || null,
        company: profile?.company || null,
        industry: profile?.industry || null,
        teamSize: profile?.team_size || null,
        role: profile?.role || null,
        useCase: profile?.use_case || null,
        theme: profile?.theme || null,
        notifications: profile?.notifications || null,
        goals: profile?.goals || null,
        onboardingCompleted: profile?.onboarding_completed || null,
        plan: profile?.plan || null,
        trialEndsAt: profile?.trial_ends_at || null,
        isActive: profile?.is_active || null,
        createdAt: profile?.created_at || null,
        updatedAt: profile?.updated_at || null,
      };

      this.updateAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error loading user profile:", error);
      this.updateAuthState({
        user: this.mapAuthUserToUser(authUser),
        isAuthenticated: true,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Profile loading error',
      });
    }
  }

  // Ensure user profile exists in database
  private async ensureUserProfile(authUser: any) {
    try {
      // Extract tenant from hostname if not already set in metadata
      let tenant = (authUser.user_metadata as any)?.tenant;
      if (!tenant) {
        tenant = extractTenantFromHostname();
        // If tenant is not 'main', verify it exists by checking if there's a user with that slug_name
        if (tenant !== 'main') {
          try {
            const { data: tenantOwner } = await supabase
              .from('users')
              .select('slug_name')
              .eq('slug_name', tenant)
              .maybeSingle();
            
            // If no tenant owner found, default to main
            if (!tenantOwner) {
              tenant = 'main';
            }
          } catch (error) {
            console.warn('Error verifying tenant, defaulting to main:', error);
            tenant = 'main';
          }
        }
      }

      await supabase.from("users").upsert({
        id: authUser.id,
        name: (authUser.user_metadata as any)?.name ?? null,
        tenant: tenant,
        contact: {
          email: authUser.email ?? null,
          phone: (authUser.user_metadata as any)?.contactPhone ?? (authUser.user_metadata as any)?.phone ?? null,
          countryCode: (authUser.user_metadata as any)?.countryCode ?? null,
        },
        is_active: true,
      });
    } catch (error) {
      console.warn("Failed to ensure user profile:", error);
      // Continue execution - this is not critical
    }
  }

  // Map auth user to our user interface
  private mapAuthUserToUser(authUser: any): AuthUser {
    return {
      id: authUser.id,
      email: authUser.email,
      fullName: (authUser.user_metadata as any)?.name || null,
      phone: (authUser.user_metadata as any)?.contactPhone || (authUser.user_metadata as any)?.phone || null,
      countryCode: (authUser.user_metadata as any)?.countryCode || null,
    };
  }

  // Update auth state and notify listeners
  private updateAuthState(updates: Partial<AuthState>) {
    this.authState = { ...this.authState, ...updates };
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Subscribe to auth state changes
  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.authState);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get current auth state
  public getAuthState(): AuthState {
    return this.authState;
  }

  // Get current user
  public getCurrentUser(): AuthUser | null {
    return this.authState.user;
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  // Check if auth is loading
  public isLoading(): boolean {
    return this.authState.isLoading;
  }

  // Get auth error
  public getError(): string | null {
    return this.authState.error;
  }

  // Sign in with email and password
  public async signIn(email: string, password: string) {
    try {
      this.updateAuthState({ isLoading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      this.updateAuthState({ error: errorMessage, isLoading: false });
      throw error;
    }
  }

  // Sign up with email, password, and optional metadata
  public async signUp(
    name: string,
    email: string,
    password: string,
    metadata?: SignUpMetadata
  ) {
    try {
      this.updateAuthState({ isLoading: true, error: null });

      // Pre-check: block duplicate phone before creating auth user
      if (metadata?.phone && metadata?.countryCode) {
        try {
          const { data: phoneExists } = await supabase.rpc('phone_exists', {
            _phone: metadata.phone,
            _country: metadata.countryCode,
          });
          if (phoneExists === true) {
            throw new Error('Phone already in use for this country');
          }
        } catch (rpcError: any) {
          if (rpcError?.message) {
            throw rpcError;
          }
          // Otherwise proceed (best-effort), DB unique index will still enforce
        }
      }

      // Get the site URL from environment variable or use current origin
      const siteUrl = typeof window !== 'undefined' 
        ? (import.meta.env.VITE_SITE_URL || window.location.origin)
        : (import.meta.env.VITE_SITE_URL || 'http://localhost:5173');
      const redirectTo = `${siteUrl}/auth/callback`;

      // Extract tenant from hostname
      let tenant = extractTenantFromHostname();
      
      // If tenant is not 'main', verify it exists
      if (tenant !== 'main') {
        try {
          const { data: tenantOwner } = await supabase
            .from('users')
            .select('slug_name')
            .eq('slug_name', tenant)
            .maybeSingle();
          
          // If no tenant owner found, default to main
          if (!tenantOwner) {
            tenant = 'main';
          }
        } catch (error) {
          console.warn('Error verifying tenant, defaulting to main:', error);
          tenant = 'main';
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: redirectTo,
          email_confirm: true, // Auto-confirm email, skip verification
          data: { 
            name, 
            contactPhone: metadata?.phone, 
            countryCode: metadata?.countryCode,
            tenant: tenant // Include tenant in metadata so trigger can use it
          } 
        },
      });
      
      if (error) throw error;

      // If we already have a session, upsert minimal profile row into public.users
      if (data.user && data.session) {
        try {
          // Extract tenant from hostname
          let tenant = extractTenantFromHostname();
          
          // If tenant is not 'main', verify it exists
          if (tenant !== 'main') {
            try {
              const { data: tenantOwner } = await supabase
                .from('users')
                .select('slug_name')
                .eq('slug_name', tenant)
                .maybeSingle();
              
              // If no tenant owner found, default to main
              if (!tenantOwner) {
                tenant = 'main';
              }
            } catch (error) {
              console.warn('Error verifying tenant, defaulting to main:', error);
              tenant = 'main';
            }
          }

          await supabase.from("users").upsert({
            id: data.user.id,
            name,
            tenant: tenant,
            contact: {
              email,
              countryCode: metadata?.countryCode ?? null,
              phone: metadata?.phone ?? null,
            },
            is_active: true,
          });
        } catch (profileError) {
          console.warn("Failed to create user profile:", profileError);
          // Continue execution - this is not critical
        }
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      this.updateAuthState({ error: errorMessage, isLoading: false });
      throw error;
    }
  }

  // Sign out
  public async signOut() {
    try {
      this.updateAuthState({ isLoading: true, error: null });
      await supabase.auth.signOut();
      this.updateAuthState({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      this.updateAuthState({ error: errorMessage, isLoading: false });
      throw error;
    }
  }

  // Update user profile
  public async updateProfile(updates: Partial<UserProfile>) {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    try {
      this.updateAuthState({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      // Reload user profile to get updated data
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await this.loadUserProfile(authUser);
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      this.updateAuthState({ error: errorMessage, isLoading: false });
      throw error;
    }
  }

  // Refresh user profile
  public async refreshProfile() {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    try {
      this.updateAuthState({ isLoading: true, error: null });
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await this.loadUserProfile(authUser);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile refresh failed';
      this.updateAuthState({ error: errorMessage, isLoading: false });
      throw error;
    }
  }

  // Utility methods
  public getUserDisplayName(): string {
    const user = this.getCurrentUser();
    return user?.fullName || user?.email || 'User';
  }

  public getUserInitials(): string {
    const user = this.getCurrentUser();
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
  }

  public hasCompletedOnboarding(): boolean {
    const user = this.getCurrentUser();
    return Boolean(user?.onboardingCompleted);
  }

  public isTrialActive(): boolean {
    const user = this.getCurrentUser();
    if (!user?.trialEndsAt) return false;
    return new Date(user.trialEndsAt) > new Date();
  }

  public getDaysUntilTrialEnds(): number {
    const user = this.getCurrentUser();
    if (!user?.trialEndsAt) return 0;
    const trialEnd = new Date(user.trialEndsAt);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Export convenience functions
export const getCurrentUser = () => authService.getCurrentUser();
export const isAuthenticated = () => authService.isAuthenticated();
export const isLoading = () => authService.isLoading();
export const getAuthError = () => authService.getError();
export const signIn = (email: string, password: string) => authService.signIn(email, password);
export const signUp = (name: string, email: string, password: string, metadata?: SignUpMetadata) => 
  authService.signUp(name, email, password, metadata);
export const signOut = () => authService.signOut();
export const updateProfile = (updates: Partial<UserProfile>) => authService.updateProfile(updates);
export const refreshProfile = () => authService.refreshProfile();
export const getUserDisplayName = () => authService.getUserDisplayName();
export const getUserInitials = () => authService.getUserInitials();
export const hasCompletedOnboarding = () => authService.hasCompletedOnboarding();
export const isTrialActive = () => authService.isTrialActive();
export const getDaysUntilTrialEnds = () => authService.getDaysUntilTrialEnds();
