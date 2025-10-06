import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Building, Calendar, Plus, Edit, MessageCircle, Save, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Conversation } from "./types";
import { ContactProperty } from "./ContactProperty";
import { createContact } from "@/lib/api/contacts/createContact";
import { fetchContactLists } from "@/lib/api/contacts/fetchContactLists";
import { createContactList } from "@/lib/api/contacts/createContactList";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber } from "@/utils/formatUtils";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";
import { outcomeMapping } from "@/components/dashboard/call-outcomes/OutcomeMapping";

interface ContactInfoPanelProps {
  conversation: Conversation;
}

interface ContactList {
  id: string;
  name: string;
  count: number;
}

interface AnalysisData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  [key: string]: any;
}

interface StructuredDataField {
  type: string;
  value: string;
  timestamp: string;
  collection_method: string;
}

export function ContactInfoPanel({ conversation }: ContactInfoPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get the latest call outcome
  const getLatestCallOutcome = () => {
    if (!conversation.calls || conversation.calls.length === 0) {
      return null;
    }

    // Sort calls by date to get the most recent one
    const sortedCalls = [...conversation.calls].sort((a, b) => 
      new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
    );
    
    // Get the most recent call
    const latestCall = sortedCalls[0];
    
    // Return the resolution/outcome from the latest call
    return latestCall.resolution || latestCall.status || null;
  };

  // Extract analysis data from the most recent call
  const getAnalysisData = (): AnalysisData => {
    if (!conversation.calls || conversation.calls.length === 0) {
      return {};
    }

    // Sort calls by date to get the most recent one
    const sortedCalls = [...conversation.calls].sort((a, b) => 
      new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
    );
    
    // Get the most recent call
    const latestCall = sortedCalls[0];
    
    // Check if the call has structured_data (analysis results)
    let structuredData = null;
    if (latestCall.analysis && typeof latestCall.analysis === 'object') {
      structuredData = latestCall.analysis;
    } else if ((latestCall as any).structured_data && typeof (latestCall as any).structured_data === 'object') {
      structuredData = (latestCall as any).structured_data;
    }

    if (!structuredData) {
      return {};
    }

    // Extract contact information from the structured data format
    const analysisData: AnalysisData = {};
    
    // Helper function to extract value from structured data field
    const extractValue = (field: any): string | undefined => {
      if (typeof field === 'string') {
        return field;
      } else if (field && typeof field === 'object' && field.value) {
        return field.value;
      }
      return undefined;
    };

    // Map structured data fields to our analysis data
    Object.keys(structuredData).forEach(key => {
      const field = structuredData[key];
      
      switch (key.toLowerCase()) {
        case 'customer name':
        case 'name':
        case 'full name':
        case 'contact name':
        case 'client name':
          analysisData.name = extractValue(field);
          break;
        case 'email address':
        case 'email':
        case 'e-mail':
          analysisData.email = extractValue(field);
          break;
        case 'phone number':
        case 'phone':
        case 'telephone':
        case 'mobile':
          analysisData.phone = extractValue(field);
          break;
        case 'company':
        case 'business':
        case 'organization':
          analysisData.company = extractValue(field);
          break;
        case 'location':
        case 'address':
        case 'city':
          analysisData.location = extractValue(field);
          break;
      }
    });

    return analysisData;
  };

  // Get display name based on whether we have structured name or not
  const getDisplayName = (): string => {
    const analysisData = getAnalysisData();
    const hasStructuredName = analysisData.name && analysisData.name.trim() !== '';
    
    if (hasStructuredName) {
      return analysisData.name; // Only name, no phone number
    } else {
      return formatPhoneNumber(conversation.phoneNumber);
    }
  };

  const analysisData = getAnalysisData();
  const hasAnalysisData = Object.keys(analysisData).length > 0;

  // Load contact lists on component mount
  useEffect(() => {
    const loadContactLists = async () => {
      try {
        const response = await fetchContactLists();
        setContactLists(response.contactLists);
      } catch (error) {
        console.error('Error loading contact lists:', error);
      }
    };

    loadContactLists();
  }, []);

  // Contact properties based on analysis data
  const contactProperties = [
    ...(analysisData.email ? [{ label: "Email", value: analysisData.email, icon: Mail }] : []),
    ...(analysisData.company ? [{ label: "Company", value: analysisData.company, icon: Building }] : []),
    ...(analysisData.location ? [{ label: "Location", value: analysisData.location, icon: MapPin }] : []),
    { label: "Phone", value: formatPhoneNumber(conversation.phoneNumber), icon: Phone },
    { label: "Last Contact", value: formatDistanceToNow(conversation.lastActivityTimestamp, { addSuffix: true }), icon: Calendar },
  ];

  const handleSaveContact = async () => {
    if (!user?.id || !hasAnalysisData) {
      toast({
        title: "Error",
        description: "No analysis data available to save contact",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      let listId = contactLists[0]?.id;

      // If no contact lists exist, create a default one
      if (!listId) {
        const listResult = await createContactList({
          name: "General Contacts",
          user_id: user.id
        });

        if (listResult.success && listResult.contactList) {
          listId = listResult.contactList.id;
          // Add the new list to our local state
          setContactLists(prev => [...prev, {
            id: listResult.contactList!.id,
            name: listResult.contactList!.name,
            count: 0
          }]);
        } else {
          throw new Error(listResult.error || "Failed to create contact list");
        }
      }

      const contactData = {
        first_name: analysisData.name?.split(' ')[0] || conversation.firstName || 'Unknown',
        last_name: analysisData.name?.split(' ').slice(1).join(' ') || conversation.lastName || '',
        phone: conversation.phoneNumber, // Use actual caller's phone number
        email: analysisData.email || undefined,
        list_id: listId,
        status: 'active' as const,
        do_not_call: false,
        user_id: user.id
      };

      const result = await createContact(contactData);
      
      if (result.success) {
        setIsSaved(true);
        toast({
          title: "Success",
          description: "Contact saved successfully!",
        });
        
        // Update contact list count
        setContactLists(prev => prev.map(list => 
          list.id === listId 
            ? { ...list, count: list.count + 1 }
            : list
        ));
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save contact",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Error",
        description: "Failed to save contact",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProperty = () => {
    // TODO: Implement add property dialog
    console.log("Add property clicked");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-[var(--space-lg)] border-b border-white/[0.08] bg-background/30">
        <div className="flex items-center justify-between mb-[var(--space-lg)]">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl font-medium bg-muted text-muted-foreground">
                {getInitials(getDisplayName())}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-medium text-foreground">
                {getDisplayName()}
              </h2>
              {analysisData.email && (
                <p className="text-xs text-muted-foreground">
                  {analysisData.email}
                </p>
              )}
            </div>
          </div>
          {hasAnalysisData && !isSaved && (
            <Button
              onClick={handleSaveContact}
              disabled={isSaving}
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs"
            >
              <Save className="h-3 w-3 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
          {isSaved && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Saved
            </Badge>
          )}
        </div>
      </div>

      {/* Contact Details */}
      <div className="flex-1 p-[var(--space-lg)] overflow-y-auto">
        <div className="space-y-[var(--space-md)]">
          {/* Overview Stats */}
          <div className="space-y-[var(--space-md)]">
            <h3 className="text-sm font-medium text-foreground">Overview</h3>
            <div className="grid grid-cols-2 gap-[var(--space-md)]">
              <div className="p-[var(--space-md)] bg-muted/20 rounded-[var(--radius-md)] border border-border/20">
                <div className="text-[10px] text-muted-foreground">Total Calls</div>
                <div className="text-base font-medium text-foreground mt-1">{conversation.totalCalls}</div>
              </div>
              <div className="p-[var(--space-md)] bg-muted/20 rounded-[var(--radius-md)] border border-border/20">
                <div className="text-[10px] text-muted-foreground">Duration</div>
                <div className="text-base font-medium text-foreground mt-1">{conversation.totalDuration}</div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-[var(--space-md)]">
            <h3 className="text-sm font-medium text-foreground">Contact Details</h3>
            {hasAnalysisData ? (
              <div className="space-y-[var(--space-sm)]">
                {contactProperties.map((property, index) => (
                  <ContactProperty 
                    key={index}
                    label={property.label} 
                    value={property.value} 
                    icon={property.icon} 
                  />
                ))}
              </div>
            ) : (
              <div className="p-[var(--space-md)] bg-muted/10 rounded-[var(--radius-md)] border border-border/10 text-xs text-muted-foreground text-center">
                No analysis data available. Contact information will appear here after call analysis.
              </div>
            )}
          </div>

          {/* Last Call Outcome */}
          <div className="space-y-[var(--space-md)]">
            <h3 className="text-sm font-medium text-foreground">Last Call Outcome</h3>
            <div className="p-[var(--space-md)] bg-muted/10 rounded-[var(--radius-md)] border border-border/10">
              {(() => {
                const latestOutcome = getLatestCallOutcome();
                if (!latestOutcome) {
                  return (
                    <Badge variant="secondary" className="text-xs px-3 py-1">
                      No outcome recorded
                    </Badge>
                  );
                }
                
                const normalizedOutcome = normalizeResolution(latestOutcome);
                const mappedOutcome = outcomeMapping[normalizedOutcome] || outcomeMapping['completed'];
                
                return (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: mappedOutcome.color }}
                    />
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-3 py-1"
                      style={{ 
                        backgroundColor: `${mappedOutcome.color}20`,
                        borderColor: `${mappedOutcome.color}40`,
                        color: mappedOutcome.color
                      }}
                    >
                      {mappedOutcome.name}
                    </Badge>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-[var(--space-md)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Notes</h3>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-3 rounded-[var(--radius-md)]">
                Add Note
              </Button>
            </div>
            <div className="p-[var(--space-md)] bg-muted/10 rounded-[var(--radius-md)] border border-border/10 text-xs text-muted-foreground text-center">
              No notes yet
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}