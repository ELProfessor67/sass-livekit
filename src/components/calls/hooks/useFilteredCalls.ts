
import { useMemo } from "react";
import { Call } from "../types";
import { useSearchFilter } from "./useSearchFilter";
import { useDateRangeFilter } from "./useDateRangeFilter";
import { useResolutionFilter } from "./useResolutionFilter";
import { prioritizedCallSort } from "@/utils/callSortUtils";

interface UseFilteredCallsResult {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  dateRange: { from: Date; to: Date };
  setDateRange: (range: { from: Date; to: Date }) => void;
  resolutionFilter: string;
  setResolutionFilter: (value: string) => void;
  filteredCalls: Call[];
}

export function useFilteredCalls(calls: Call[]): UseFilteredCallsResult {
  const { searchQuery, setSearchQuery, filteredBySearch } = useSearchFilter(calls);
  const { dateRange, setDateRange, filteredByDateRange } = useDateRangeFilter(filteredBySearch);
  const { resolutionFilter, setResolutionFilter, filteredByResolution } = useResolutionFilter(filteredByDateRange);
  
  // Apply the final filtering and sorting
  const filteredCalls = useMemo(() => {
    if (!calls || calls.length === 0) {
      console.log("useFilteredCalls: No calls data to filter");
      return [];
    }
    
    console.log(`useFilteredCalls: Combined filtering resulted in ${filteredByResolution.length} calls`);
    
    // Apply the enhanced prioritized sorting for diverse display with booked appointments first
    // Pass true to explicitly prioritize appointments in the same way as useCallDataProcessor
    return prioritizedCallSort(filteredByResolution, true);
  }, [filteredByResolution, calls]);
  
  return {
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    resolutionFilter,
    setResolutionFilter,
    filteredCalls
  };
}
