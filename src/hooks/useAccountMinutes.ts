import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface AccountMinutes {
  remainingMinutes: number;
  planName: string;
  percentageUsed: number;
  isLoading: boolean;
}

export function useAccountMinutes(): AccountMinutes {
  const { user } = useAuth();
  const [remainingMinutes, setRemainingMinutes] = useState(10000);
  const [planName, setPlanName] = useState("Pro Plan");
  const [percentageUsed, setPercentageUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    
    // Simulate API call - replace with actual API call
    const fetchAccountMinutes = async () => {
      try {
        // Mock data - replace with actual API call
        const mockData = {
          totalMinutes: 10000,
          usedMinutes: 2500,
          planName: user.plan || "Pro Plan"
        };
        
        const remaining = mockData.totalMinutes - mockData.usedMinutes;
        const percentage = (mockData.usedMinutes / mockData.totalMinutes) * 100;
        
        setRemainingMinutes(remaining);
        setPlanName(mockData.planName);
        setPercentageUsed(percentage);
      } catch (error) {
        console.error('Error fetching account minutes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountMinutes();
  }, [user]);

  return {
    remainingMinutes,
    planName,
    percentageUsed,
    isLoading
  };
}
