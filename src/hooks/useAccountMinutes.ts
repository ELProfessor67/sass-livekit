import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AccountMinutes {
  totalMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  planName: string;
  percentageUsed: number;
  isLoading: boolean;
}

export function useAccountMinutes(): AccountMinutes {
  const { user } = useAuth();
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [usedMinutes, setUsedMinutes] = useState(0);
  const [planName, setPlanName] = useState("Free Plan");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setTotalMinutes(0);
      setUsedMinutes(0);
      setPlanName("Free Plan");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const fetchMinutes = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("minutes_limit, minutes_used, plan")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        setTotalMinutes(data?.minutes_limit || 0);
        setUsedMinutes(data?.minutes_used || 0);
        setPlanName(data?.plan || user.plan || "Free Plan");
      } catch (error) {
        console.error("Error fetching account minutes:", error);
        setTotalMinutes(0);
        setUsedMinutes(0);
        setPlanName(user.plan || "Free Plan");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMinutes();
  }, [user]);

  const remainingMinutes = Math.max(0, totalMinutes - usedMinutes);
  const percentageUsed = totalMinutes > 0 ? Math.min((usedMinutes / totalMinutes) * 100, 100) : 0;

  return {
    totalMinutes,
    usedMinutes,
    remainingMinutes,
    planName,
    percentageUsed,
    isLoading,
  };
}
