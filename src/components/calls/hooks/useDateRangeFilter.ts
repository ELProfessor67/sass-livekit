
import { useState, useMemo, useEffect } from "react";
import { Call } from "../types";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";

export function useDateRangeFilter(calls: Call[]) {
  // Initialize date range from session storage using a priority order for synchronization
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    // First, try to get from Recent Calls component which has the most up-to-date range
    try {
      const recentCallsRange = sessionStorage.getItem('recentCallsDateRange');
      if (recentCallsRange) {
        const parsed = JSON.parse(recentCallsRange);
        return {
          from: new Date(parsed.from),
          to: new Date(parsed.to)
        };
      }
    } catch (e) {
      console.error("Error parsing recent calls date range", e);
    }
    
    // Second, try to get from dashboard's last used range
    try {
      const dashboardRange = sessionStorage.getItem('lastDashboardDateRange');
      if (dashboardRange) {
        const parsed = JSON.parse(dashboardRange);
        return {
          from: new Date(parsed.from),
          to: new Date(parsed.to)
        };
      }
    } catch (e) {
      console.error("Error parsing stored date range", e);
    }
    
    // Default fallback
    return {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    };
  });
  
  const filteredByDateRange = useMemo(() => {
    
    return calls.filter(call => {
      // Construct a proper date object from date and time strings
      const callDate = call.date && call.time ? 
        new Date(`${call.date}T${call.time || '00:00'}`) : 
        new Date(); // Fallback to current date if no date/time provided
      
      // Date range filter - make sure the ranges are comparable
      return isWithinInterval(callDate, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to)
      });
    });
  }, [calls, dateRange]);
  
  // When date range changes, store it for synchronization
  useEffect(() => {
    try {
      // Update both session storage keys to ensure proper synchronization
      sessionStorage.setItem('callsPageDateRange', JSON.stringify({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString() 
      }));
      
      // Also update the dashboard date range for round-trip synchronization
      sessionStorage.setItem('lastDashboardDateRange', JSON.stringify({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString() 
      }));
    } catch (e) {
      console.error("Error storing date range", e);
    }
  }, [dateRange]);
  
  return {
    dateRange,
    setDateRange,
    filteredByDateRange
  };
}
