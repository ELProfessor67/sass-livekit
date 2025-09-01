import React, { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
import { ConversationsList } from "@/components/conversations/ConversationsList";
import { MessageThread } from "@/components/conversations/MessageThread";
import { ContactInfoPanel } from "@/components/conversations/ContactInfoPanel";
import { Conversation } from "@/components/conversations/types";
import { generateCalls } from "@/lib/api/mockData/generator";
import ConversationsToolbar from "@/components/conversations/ConversationsToolbar";
import { useConversationsFilter } from "@/components/conversations/hooks/useConversationsFilter";

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Generate mock call data - using useMemo to maintain consistency
  const rawCalls = useMemo(() => {
    return generateCalls(150);
  }, []);

  // Use conversations filter hook
  const {
    searchQuery,
    setSearchQuery,
    resolutionFilter,
    setResolutionFilter,
    dateRange,
    setDateRange,
    conversations: filteredConversations,
    filteredCount
  } = useConversationsFilter(rawCalls);

  // Auto-select first conversation on load
  useEffect(() => {
    if (filteredConversations.length > 0 && !selectedConversation) {
      setSelectedConversation(filteredConversations[0]);
    }
  }, [filteredConversations, selectedConversation]);

  // Reset selected conversation if it's no longer in filtered results
  useEffect(() => {
    if (selectedConversation && !filteredConversations.find(c => c.id === selectedConversation.id)) {
      setSelectedConversation(filteredConversations.length > 0 ? filteredConversations[0] : null);
    }
  }, [filteredConversations, selectedConversation]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="no-hover-scaling">
        <div className="container mx-auto px-[var(--space-lg)]">
          <div className="max-w-6xl mx-auto">
            <ThemeSection spacing="lg">
              {/* Header */}
              <div className="flex flex-col space-y-[var(--space-md)]">
                <h1 className="text-4xl font-extralight tracking-tight text-foreground">
                  Conversations
                </h1>
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
                    <MessageThread conversation={selectedConversation} />
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
            </ThemeSection>
          </div>
        </div>
      </ThemeContainer>
    </DashboardLayout>
  );
}