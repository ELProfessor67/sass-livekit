import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (user) {
          // Ensure contact info exists in public.users from auth metadata
          try {
            await supabase.from("users").upsert({
              id: user.id,
              name: (user.user_metadata as any)?.name ?? null,
              contact: {
                email: user.email ?? null,
                phone: (user.user_metadata as any)?.contactPhone ?? (user.user_metadata as any)?.phone ?? null,
                countryCode: (user.user_metadata as any)?.countryCode ?? null,
              },
              is_active: true,
            });
          } catch (_) {
            // ignore
          }
          setUser({
            id: user.id,
            email: user.email ?? null,
            fullName: (user.user_metadata as any)?.name ?? null,
          });
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user;
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email ?? null,
          fullName: (authUser.user_metadata as any)?.name ?? null,
        });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
    metadata?: { phone?: string; countryCode?: string }
  ) => {
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
        // If RPC throws a duplicate or any explicit error, surface it
        if (rpcError?.message) {
          throw rpcError;
        }
        // otherwise proceed (best-effort), DB unique index will still enforce
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, contactPhone: metadata?.phone, countryCode: metadata?.countryCode } },
    });
    if (error) throw error;

    // If we already have a session, upsert minimal profile row into public.users
    if (data.user && data.session) {
      try {
        await supabase.from("users").upsert({
          id: data.user.id,
          name,
          contact: {
            email,
            countryCode: metadata?.countryCode ?? null,
            phone: metadata?.phone ?? null,
          },
          is_active: true,
        });
      } catch (_) {
        // ignore profile insert errors silently
      }
    }
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    logout: signOut,
  };
}