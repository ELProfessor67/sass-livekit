
import { useState, useMemo } from "react";
import { Call } from "../types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";

export function useResolutionFilter(calls: Call[]) {
  const [resolutionFilter, setResolutionFilter] = useState("all");
  
  const filteredByResolution = useMemo(() => {
    if (resolutionFilter === "all") return calls;
    
    console.log(`useResolutionFilter: Filtering ${calls.length} calls with resolution: ${resolutionFilter}`);
    
    return calls.filter(call => {
      // Use the normalized resolution for consistent filtering
      const normalizedCallResolution = normalizeResolution(call.resolution || '');
      const normalizedFilterResolution = resolutionFilter.toLowerCase();
      
      return normalizedCallResolution === normalizedFilterResolution;
    });
  }, [calls, resolutionFilter]);
  
  return {
    resolutionFilter,
    setResolutionFilter,
    filteredByResolution
  };
}
