
import { useEffect } from "react";
import { Call } from "./types";
import { useFilteredCalls } from "./hooks/useFilteredCalls";
import { usePagination } from "./hooks/usePagination";

export function useCallsFilter(calls: Call[]) {
  const {
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    resolutionFilter,
    setResolutionFilter,
    filteredCalls
  } = useFilteredCalls(calls);
  
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedCalls
  } = usePagination(filteredCalls);
  
  // Reset page number when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, resolutionFilter, setCurrentPage]);
  
  return {
    searchQuery,
    setSearchQuery,
    resolutionFilter,
    setResolutionFilter,
    dateRange,
    setDateRange,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedCalls,
    filteredCalls, // Export the filtered calls for better data tracking
  };
}
