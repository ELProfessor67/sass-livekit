
import { useState, useMemo } from "react";
import { Call } from "../types";

export function usePagination(filteredCalls: Call[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / itemsPerPage));
  
  // Make sure current page is always valid
  const safePage = useMemo(() => {
    return Math.min(Math.max(1, currentPage), totalPages);
  }, [currentPage, totalPages]);
  
  // Update page if needed
  if (safePage !== currentPage) {
    setCurrentPage(safePage);
  }
  
  const paginatedCalls = useMemo(() => {
    return filteredCalls.slice(
      (safePage - 1) * itemsPerPage,
      safePage * itemsPerPage
    );
  }, [filteredCalls, safePage, itemsPerPage]);
  
  console.log(`usePagination: Page ${safePage}/${totalPages}, showing ${paginatedCalls.length} of ${filteredCalls.length} filtered calls`);
  
  return {
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    paginatedCalls
  };
}
