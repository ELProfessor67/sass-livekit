import { useState, useMemo, useEffect } from "react";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Conversation } from "../types";
import { Call } from "@/components/calls/types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";
import { groupCallsIntoConversations } from "@/utils/conversations/conversationUtils";

export function useConversationsFilter(rawCalls: Call[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [resolutionFilter, setResolutionFilter] = useState("all");
  const [dateRange, setDateRange] = useState(() => {
    // Try to get stored date range or default to last 30 days
    const stored = sessionStorage.getItem('conversationsPageDateRange');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          from: new Date(parsed.from),
          to: new Date(parsed.to)
        };
      } catch {
        // Fall through to default
      }
    }
    
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { from: startOfDay(start), to: endOfDay(end) };
  });

  // Store date range changes in session storage
  useEffect(() => {
    sessionStorage.setItem('conversationsPageDateRange', JSON.stringify({
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    }));
    // Also sync with dashboard
    sessionStorage.setItem('lastDashboardDateRange', JSON.stringify({
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    }));
  }, [dateRange]);

  // Filter calls by date range first
  const filteredCallsByDate = useMemo(() => {
    const start = startOfDay(dateRange.from);
    const end = endOfDay(dateRange.to);
    
    return rawCalls.filter(call => {
      const callDate = new Date(call.date);
      return isWithinInterval(callDate, { start, end });
    });
  }, [rawCalls, dateRange]);

  // Filter calls by resolution/outcome
  const filteredCallsByResolution = useMemo(() => {
    if (resolutionFilter === "all") return filteredCallsByDate;
    
    return filteredCallsByDate.filter(call => {
      const normalizedCallResolution = normalizeResolution(call.resolution || '');
      const normalizedFilterResolution = resolutionFilter.toLowerCase();
      
      return normalizedCallResolution === normalizedFilterResolution;
    });
  }, [filteredCallsByDate, resolutionFilter]);

  // Group filtered calls into conversations
  const conversations = useMemo(() => {
    return groupCallsIntoConversations(filteredCallsByResolution);
  }, [filteredCallsByResolution]);

  // Apply search filter to conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    
    const lowerSearchQuery = searchQuery.toLowerCase();
    
    return conversations.filter(conversation => 
      conversation.displayName.toLowerCase().includes(lowerSearchQuery) ||
      conversation.phoneNumber.includes(searchQuery) ||
      conversation.calls.some(call => 
        call.summary?.toLowerCase().includes(lowerSearchQuery) ||
        normalizeResolution(call.resolution || '').toLowerCase().includes(lowerSearchQuery) ||
        call.name?.toLowerCase().includes(lowerSearchQuery)
      )
    );
  }, [conversations, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    resolutionFilter,
    setResolutionFilter,
    dateRange,
    setDateRange,
    conversations: filteredConversations,
    totalConversations: conversations.length,
    filteredCount: filteredConversations.length
  };
}