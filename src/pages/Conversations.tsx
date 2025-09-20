import React, { useState, useMemo, useEffect, useRef } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
import { ConversationsList } from "@/components/conversations/ConversationsList";
import { MessageThread } from "@/components/conversations/MessageThread";
import { ContactInfoPanel } from "@/components/conversations/ContactInfoPanel";
import { Conversation } from "@/components/conversations/types";
import { fetchConversations } from "@/lib/api/conversations/fetchConversations";
import ConversationsToolbar from "@/components/conversations/ConversationsToolbar";
import { useConversationsFilter } from "@/components/conversations/hooks/useConversationsFilter";
import { useAuth } from "@/contexts/AuthContext";
import { useRouteChangeData } from "@/hooks/useRouteChange";
import { useToast } from "@/hooks/use-toast";

export default function Conversations() {
  const { user, loading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPageVisibleRef = useRef(true);
  const hasInitiallySelectedRef = useRef(false);
  const hasManualSelectionRef = useRef(false);
  const [messageFilter, setMessageFilter] = useState<'all' | 'calls' | 'sms'>('all');

  // Fetch real conversations data
  const loadConversations = async (isPolling = false, shouldSort = true) => {
    // Don't fetch data if auth is still loading or user is not authenticated
    if (isAuthLoading || !user?.id) {
      setIsLoading(false);
      return;
    }

    // Don't poll if page is not visible
    if (isPolling && !isPageVisibleRef.current) {
      return;
    }

    try {
      if (!isPolling) {
        setIsLoading(true);
      }
      setError(null);
      const response = await fetchConversations(shouldSort);

      // Debug logging
      console.log('🔍 Conversations update debug:', {
        isPolling,
        previousConversationsCount: conversations.length,
        newConversationsCount: response.conversations.length,
        previousSMS: conversations.map(c => ({ id: c.id, totalSMS: c.totalSMS })),
        newSMS: response.conversations.map(c => ({ id: c.id, totalSMS: c.totalSMS }))
      });

      // Check if there are new messages by comparing with previous data
      const newMessages = conversations.length > 0 ?
        response.conversations.filter(newConv => {
          const oldConv = conversations.find(c => c.id === newConv.id);
          const hasNewSMS = oldConv ? newConv.totalSMS > oldConv.totalSMS : false;
          const hasNewCalls = oldConv ? newConv.totalCalls > oldConv.totalCalls : false;
          const hasNewActivity = oldConv && new Date(newConv.lastActivityTimestamp) > new Date(oldConv.lastActivityTimestamp);

          // Always log for debugging
          console.log('🔍 Comparing conversation:', {
            conversationId: newConv.id,
            phoneNumber: newConv.phoneNumber,
            oldSMS: oldConv?.totalSMS || 0,
            newSMS: newConv.totalSMS,
            oldCalls: oldConv?.totalCalls || 0,
            newCalls: newConv.totalCalls,
            hasNewSMS,
            hasNewCalls,
            hasNewActivity
          });

          if (hasNewSMS || hasNewCalls || hasNewActivity) {
            console.log('🆕 New message detected:', {
              conversationId: newConv.id,
              hasNewSMS,
              hasNewCalls,
              hasNewActivity,
              oldSMS: oldConv?.totalSMS,
              newSMS: newConv.totalSMS,
              oldCalls: oldConv?.totalCalls,
              newCalls: newConv.totalCalls
            });
          }

          return hasNewSMS || hasNewCalls || hasNewActivity;
        }) : response.conversations; // Treat all conversations as new when no previous data

      // Add flags for new messages to conversations
      const conversationsWithFlags = response.conversations.map(conv => {
        const oldConv = conversations.find(c => c.id === conv.id);
        const hasNewSMS = oldConv ? conv.totalSMS > oldConv.totalSMS : false;
        const hasNewCalls = oldConv ? conv.totalCalls > oldConv.totalCalls : false;
        const hasNewMessages = hasNewSMS || hasNewCalls ||
          (oldConv && new Date(conv.lastActivityTimestamp) > new Date(oldConv.lastActivityTimestamp));

        return {
          ...conv,
          hasNewMessages,
          hasNewSMS,
          hasNewCalls
        };
      });

      console.log('📊 Conversations with flags:', conversationsWithFlags.map(c => ({
        id: c.id,
        totalSMS: c.totalSMS,
        hasNewMessages: c.hasNewMessages,
        hasNewSMS: c.hasNewSMS,
        hasNewCalls: c.hasNewCalls
      })));

      setConversations(conversationsWithFlags);
      setLastUpdateTime(new Date());

      // Update selected conversation with new data if it exists
      if (selectedConversation) {
        const updatedSelectedConversation = conversationsWithFlags.find(c => c.id === selectedConversation.id);
        if (updatedSelectedConversation) {
          console.log('🔄 Updating selected conversation:', {
            conversationId: selectedConversation.id,
            oldSMS: selectedConversation.totalSMS,
            newSMS: updatedSelectedConversation.totalSMS,
            oldSMSMessages: selectedConversation.smsMessages?.length || 0,
            newSMSMessages: updatedSelectedConversation.smsMessages?.length || 0,
            hasNewSMS: updatedSelectedConversation.hasNewSMS,
            hasNewMessages: updatedSelectedConversation.hasNewMessages,
            isPolling,
            hasInitiallySelected: hasInitiallySelectedRef.current
          });

          // Check if the SMS messages are actually different
          const oldSMSIds = selectedConversation.smsMessages?.map(sms => sms.messageSid) || [];
          const newSMSIds = updatedSelectedConversation.smsMessages?.map(sms => sms.messageSid) || [];
          const smsChanged = JSON.stringify(oldSMSIds.sort()) !== JSON.stringify(newSMSIds.sort());

          console.log('📱 SMS comparison:', {
            oldSMSIds: oldSMSIds.slice(0, 3), // Show first 3
            newSMSIds: newSMSIds.slice(0, 3), // Show first 3
            smsChanged,
            willUpdate: smsChanged || updatedSelectedConversation.hasNewSMS
          });

          // Only update if there are actual changes AND it's not a manual selection
          if ((smsChanged || updatedSelectedConversation.hasNewSMS) && !hasManualSelectionRef.current) {
            console.log('🔄 Updating selected conversation from polling:', {
              conversationId: updatedSelectedConversation.id,
              isPolling,
              reason: smsChanged ? 'SMS changed' : 'New SMS'
            });
            setSelectedConversation(updatedSelectedConversation);
          } else {
            console.log('⏭️ Skipping selected conversation update:', {
              smsChanged,
              hasNewSMS: updatedSelectedConversation.hasNewSMS,
              hasManualSelection: hasManualSelectionRef.current,
              reason: hasManualSelectionRef.current ? 'Manual selection - no interference' : 'No changes detected'
            });
          }
        } else {
          console.log('⚠️ Selected conversation not found in updated conversations:', selectedConversation.id);
          console.log('Available conversation IDs:', conversationsWithFlags.map(c => c.id));
        }
      }

      // Show notification for new messages (only when polling)
      if (isPolling && newMessages.length > 0) {
        const newSMSMessages = newMessages.filter(conv => {
          const oldConv = conversations.find(c => c.id === conv.id);
          return oldConv && conv.totalSMS > oldConv.totalSMS;
        });

        const newCallMessages = newMessages.filter(conv => {
          const oldConv = conversations.find(c => c.id === conv.id);
          return oldConv && conv.totalCalls > oldConv.totalCalls;
        });


      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      if (!isPolling) {
        setError('Failed to load conversations');
        setConversations([]);
      }
    } finally {
      if (!isPolling) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadConversations();
  }, [isAuthLoading, user?.id]);

  // Trigger API call on route changes
  useRouteChangeData(loadConversations, [isAuthLoading, user?.id], {
    enabled: !isAuthLoading && !!user?.id,
    refetchOnRouteChange: true
  });

  // Start/stop polling based on authentication and page visibility
  useEffect(() => {
    if (!isAuthLoading && user?.id) {
      // Start polling every 30 seconds to reduce unnecessary updates
      setIsPolling(true);
      pollingIntervalRef.current = setInterval(() => {
        console.log('🔄 Polling: Fetching conversations...', new Date().toLocaleTimeString());
        loadConversations(true, false); // Don't sort during polling
      }, 30000); // Poll every 30 seconds

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsPolling(false);
      };
    } else {
      // Stop polling if user is not authenticated
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
    }
  }, [isAuthLoading, user?.id]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;

      // If page becomes visible and we haven't updated in a while, refresh immediately
      if (!document.hidden && lastUpdateTime) {
        const timeSinceLastUpdate = Date.now() - lastUpdateTime.getTime();
        if (timeSinceLastUpdate > 30000) { // If more than 30 seconds since last update
          loadConversations(true, false); // Don't sort during polling
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastUpdateTime]);

  // Use conversations filter hook with real data
  const {
    searchQuery,
    setSearchQuery,
    resolutionFilter,
    setResolutionFilter,
    dateRange,
    setDateRange,
    conversations: filteredConversations,
    filteredCount
  } = useConversationsFilter(conversations);

  // Auto-select first conversation on initial load only
  useEffect(() => {
    console.log('🔄 Auto-selection check:', {
      filteredConversationsLength: filteredConversations.length,
      selectedConversationId: selectedConversation?.id,
      hasInitiallySelected: hasInitiallySelectedRef.current,
      hasManualSelection: hasManualSelectionRef.current,
      isLoading
    });
    
    // Only auto-select if:
    // 1. We have conversations
    // 2. No conversation is selected
    // 3. We haven't made any selection yet (initial or manual)
    // 4. We're not loading
    if (filteredConversations.length > 0 && 
        !selectedConversation && 
        !hasInitiallySelectedRef.current && 
        !hasManualSelectionRef.current &&
        !isLoading) {
      console.log('🎯 Auto-selecting first conversation:', filteredConversations[0].id);
      setSelectedConversation(filteredConversations[0]);
      hasInitiallySelectedRef.current = true;
    }
  }, [filteredConversations.length, isLoading]);

  // Reset selected conversation if it's no longer in filtered results
  useEffect(() => {
    if (selectedConversation && !filteredConversations.find(c => c.id === selectedConversation.id)) {
      setSelectedConversation(filteredConversations.length > 0 ? filteredConversations[0] : null);
    }
  }, [filteredConversations, selectedConversation]);

  const handleSelectConversation = (conversation: Conversation) => {
    console.log('🎯 Manual conversation selection:', conversation.id);
    setSelectedConversation(conversation);
    hasInitiallySelectedRef.current = true; // Mark that we've made a selection
    hasManualSelectionRef.current = true; // Mark that we've made a manual selection

    // Clear new message flags for the selected conversation
    setConversations(prevConversations =>
      prevConversations.map(conv =>
        conv.id === conversation.id
          ? { ...conv, hasNewMessages: false, hasNewSMS: false, hasNewCalls: false }
          : conv
      )
    );
  };

  if (isAuthLoading || isLoading) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="no-hover-scaling">
          <div className="container mx-auto px-[var(--space-lg)]">
            <div className="max-w-6xl mx-auto">
              <ThemeSection spacing="lg">
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading conversations...</p>
                  </div>
                </div>
              </ThemeSection>
            </div>
          </div>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="no-hover-scaling">
          <div className="container mx-auto px-[var(--space-lg)]">
            <div className="max-w-6xl mx-auto">
              <ThemeSection spacing="lg">
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="text-destructive mb-4">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Conversations</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </ThemeSection>
            </div>
          </div>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="no-hover-scaling">
        <div className="container mx-auto px-[var(--space-lg)]">
          <div className="max-w-6xl mx-auto">
            <ThemeSection spacing="lg">
              {/* Header */}
              <div className="flex flex-col space-y-[var(--space-md)]">
                <div className="flex items-center justify-between">
                  <h1 className="text-4xl font-extralight tracking-tight text-foreground">
                    Conversations
                  </h1>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // Clear all new message flags when manually refreshing
                        setConversations(prevConversations =>
                          prevConversations.map(conv => ({
                            ...conv,
                            hasNewMessages: false,
                            hasNewSMS: false,
                            hasNewCalls: false
                          }))
                        );
                        loadConversations(false, true); // Sort on manual refresh
                      }}
                      disabled={isLoading}
                      className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Refresh</span>
                        </div>
                      )}
                    </button>

                    {/* Real-time status indicator */}
                    {isPolling && (
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Live updates</span>
                        {lastUpdateTime && (
                          <span className="text-[10px] opacity-75">
                            • Last updated {lastUpdateTime.toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-lg font-light">
                    Manage your customer conversations and messages
                  </p>
                  <div className="text-sm text-muted-foreground">
                    {filteredCount} conversations
                  </div>
                </div>
              </div>

              {/* Conversations Toolbar */}
              <ConversationsToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                resolutionFilter={resolutionFilter}
                onResolutionChange={setResolutionFilter}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />



              {/* Unified Three-Panel Layout */}
              {filteredConversations.length === 0 ? (
                <ThemeCard variant="glass" className="h-[calc(100vh-8rem)] flex items-center justify-center rounded-[var(--radius-lg)]">
                  <div className="text-center text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No Conversations Found</h3>
                    <p className="mb-4">
                      {conversations.length === 0
                        ? "No conversations have been recorded yet. Conversations will appear here when calls are made."
                        : "No conversations match your current filters. Try adjusting your search or date range."
                      }
                    </p>
                    {conversations.length === 0 && (
                      <button
                        onClick={() => loadConversations(false, true)} // Sort on manual refresh
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Refresh
                      </button>
                    )}
                  </div>
                </ThemeCard>
              ) : (
                <ThemeCard variant="glass" className="h-[calc(100vh-8rem)] flex rounded-[var(--radius-lg)] overflow-hidden">
                  {/* Left Panel - Conversations List */}
                  <div className="w-72 flex flex-col border-r border-border/50">
                    <ConversationsList
                      conversations={filteredConversations}
                      selectedConversationId={selectedConversation?.id}
                      onSelectConversation={handleSelectConversation}
                    />
                  </div>

                  {/* Middle Panel - Message Thread */}
                  <div className="flex-1 flex flex-col border-r border-border/50">
                    {selectedConversation ? (
                      <MessageThread
                        key={selectedConversation.id}
                        conversation={selectedConversation}
                        messageFilter={messageFilter}
                        onMessageFilterChange={setMessageFilter}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <div className="text-lg font-medium mb-2">
                            Select a conversation
                          </div>
                          <p>
                            Choose a conversation from the list to start messaging
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Panel - Contact Info */}
                  <div className="w-72 flex flex-col">
                    {selectedConversation ? (
                      <ContactInfoPanel conversation={selectedConversation} />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <div className="text-lg font-medium mb-2">
                            Contact Details
                          </div>
                          <p className="text-sm">
                            Select a conversation to view contact information
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ThemeCard>
              )}
            </ThemeSection>
          </div>
        </div>
      </ThemeContainer>
    </DashboardLayout>
  );
}