
import { useState, useMemo } from "react";
import { Call } from "../types";

export function useSearchFilter(calls: Call[]) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return calls;
    
    console.log(`useSearchFilter: Filtering ${calls.length} calls with search: "${searchQuery}"`);
    
    // Enhanced search to handle multiple search terms and partial matches
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean);
    
    return calls.filter(call => {
      const searchableFields = [
        call.first_name,
        call.last_name,
        call.name,
        call.phoneNumber
      ].filter(Boolean).map(field => field?.toLowerCase() || '');
      
      return searchTerms.every(term => 
        searchableFields.some(field => field.includes(term))
      );
    });
  }, [calls, searchQuery]);
  
  return {
    searchQuery,
    setSearchQuery,
    filteredBySearch
  };
}
