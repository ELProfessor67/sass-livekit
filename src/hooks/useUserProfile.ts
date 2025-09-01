import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("users")
      .select("id, name, company, industry, team_size, role, use_case, theme, notifications, goals, onboarding_completed, plan, trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      setError(error.message);
      setProfile(null);
    } else {
      setProfile(data as UserProfile | null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { profile, isLoading, error, refetch: fetchProfile };
}


