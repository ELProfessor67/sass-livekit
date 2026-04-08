import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AccountMinutes {
  totalMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  planName: string;
  percentageUsed: number;
  isLoading: boolean;
  refetch: () => void;
}

export function useAccountMinutes(): AccountMinutes {
  const { user } = useAuth();
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [usedMinutes, setUsedMinutes] = useState(0);
  const [planName, setPlanName] = useState("Free Plan");
  const [isLoading, setIsLoading] = useState(false);

  const fetchMinutes = useCallback(async () => {
    if (!user) {
      setTotalMinutes(0);
      setUsedMinutes(0);
      setPlanName("Free Plan");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("workspace_settings")
        .select("minute_limit, minutes_used")
        .eq("user_id", user.id)
        .eq("workspace_name", "Main Account")
        .limit(1);

      const data = rows?.[0] ?? null;

      if (error) throw error;

      setTotalMinutes(data?.minute_limit || 0);
      setUsedMinutes(data?.minutes_used || 0);
      setPlanName(user.plan || "Free Plan");
    } catch (error) {
      console.error("Error fetching account minutes:", error);
      setTotalMinutes(0);
      setUsedMinutes(0);
      setPlanName(user.plan || "Free Plan");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMinutes();
  }, [fetchMinutes]);

  // Refetch when the user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchMinutes();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchMinutes]);

  // Realtime subscription — update instantly when minute_limit or minutes_used changes in Main Account workspace
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`account-minutes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_settings",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row?.workspace_name === "Main Account") {
            if (row.minute_limit !== undefined) setTotalMinutes(row.minute_limit || 0);
            if (row.minutes_used !== undefined) setUsedMinutes(row.minutes_used || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const remainingMinutes = Math.max(0, totalMinutes - usedMinutes);
  const percentageUsed = totalMinutes > 0 ? Math.min((usedMinutes / totalMinutes) * 100, 100) : 0;

  return {
    totalMinutes,
    usedMinutes,
    remainingMinutes,
    planName,
    percentageUsed,
    isLoading,
    refetch: fetchMinutes,
  };
}
