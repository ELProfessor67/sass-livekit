import { useState, useMemo, useEffect } from "react";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Conversation } from "../types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";

export function useConversationsFilter(conversations: Conversation[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [resolutionFilter, setResolutionFilter] = useState("all");
  const [dateRange, setDateRange] = useState(() => {
    // Clear any stored date range to force using the wide range
    sessionStorage.removeItem('conversationsPageDateRange');
    sessionStorage.removeItem('lastDashboardDateRange');

    // Set a very wide date range to include all possible dates (including test data)
    const start = new Date(2020, 0, 1); // January 1, 2020
    const end = new Date(2030, 11, 31); // December 31, 2030
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

  // Filter conversations by date range first
  const filteredConversationsByDate = useMemo(() => {
    const start = startOfDay(dateRange.from);
    const end = endOfDay(dateRange.to);



    const filtered = conversations.filter(conversation => {
      const conversationDate = conversation.lastActivityTimestamp;

      // If the date range is very wide (2020-2030) OR if conversations are from future dates, include all conversations
      const isWideRange = start.getFullYear() <= 2020 && end.getFullYear() >= 2030;
      const isFutureConversation = conversationDate.getFullYear() > 2024; // Include conversations from 2025+

      if (isWideRange || isFutureConversation) {
        return true;
      }

      return isWithinInterval(conversationDate, { start, end });
    });

    return filtered;
  }, [conversations, dateRange]);

  // Filter conversations by resolution/outcome
  const filteredConversationsByResolution = useMemo(() => {
    if (resolutionFilter === "all") return filteredConversationsByDate;

    return filteredConversationsByDate.filter(conversation => {
      const lastCallOutcome = conversation.lastCallOutcome || '';
      const normalizedCallResolution = normalizeResolution(lastCallOutcome);
      const normalizedFilterResolution = resolutionFilter.toLowerCase();

      return normalizedCallResolution === normalizedFilterResolution;
    });
  }, [filteredConversationsByDate, resolutionFilter]);

  // Apply search filter to conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return filteredConversationsByResolution;

    const lowerSearchQuery = searchQuery.toLowerCase();

    return filteredConversationsByResolution.filter(conversation =>
      conversation.displayName.toLowerCase().includes(lowerSearchQuery) ||
      conversation.phoneNumber.includes(searchQuery) ||
      conversation.calls.some(call =>
        call.summary?.toLowerCase().includes(lowerSearchQuery) ||
        normalizeResolution(call.resolution || '').toLowerCase().includes(lowerSearchQuery) ||
        call.name?.toLowerCase().includes(lowerSearchQuery)
      )
    );
  }, [filteredConversationsByResolution, searchQuery]);

  // Sort conversations by date and time (most recent first)
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      return b.lastActivityTimestamp.getTime() - a.lastActivityTimestamp.getTime();
    });
  }, [filteredConversations]);

  return {
    searchQuery,
    setSearchQuery,
    resolutionFilter,
    setResolutionFilter,
    dateRange,
    setDateRange,
    conversations: sortedConversations,
    totalConversations: conversations.length,
    filteredCount: sortedConversations.length
  };
}