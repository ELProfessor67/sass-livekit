import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, Database, Users, Zap, Phone, MessageSquare, Calendar, CheckCircle2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TwilioIntegrationCard } from "./integrations/TwilioIntegrationCard";
import { SecurityCard } from "./integrations/SecurityCard";
import { TwilioAuthDialog } from "./TwilioAuthDialog";
import { CalendarIntegrationCard } from "./CalendarIntegrationCard";
import { CalendarAuthDialog } from "./CalendarAuthDialog";
import type { TwilioIntegration, TwilioCredentials } from "./integrations/types";
import { TwilioCredentialsService, type UserTwilioCredentials } from "@/lib/twilio-credentials";
import { CalendarCredentialsService, type UserCalendarCredentials, type CalendarCredentialsInput } from "@/lib/calendar-credentials";
import { WhatsAppIntegrationCard } from "./WhatsAppIntegrationCard";
import { WhatsAppCredentialsService, type UserWhatsAppCredentials } from "@/lib/whatsapp-credentials";

const integrations = [
  // CRM Integrations
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync HubSpot contacts and log call activity automatically",
    icon: Building2,
    status: "available",
    category: "CRM",
    brandColor: "#ff7a59"
  },
  {
    id: "salesforce", 
    name: "Salesforce",
    description: "Connect your Salesforce CRM to sync contacts and opportunities",
    icon: Database,
    status: "available",
    category: "CRM",
    brandColor: "#00a1e0"
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    description: "Integrate with Zoho CRM for seamless contact management",
    icon: Users,
    status: "available", 
    category: "CRM",
    brandColor: "#e42527"
  },
  {
    id: "gohighlevel",
    name: "GoHighLevel", 
    description: "All-in-one CRM and marketing automation platform",
    icon: Zap,
    status: "available",
    category: "CRM",
    brandColor: "#7c3aed"
  },
  // Communication Integrations
  {
    id: "twilio",
    name: "Twilio",
    description: "Cloud communications platform for voice, SMS, and video",
    icon: Phone,
    status: "connected",
    category: "Communication", 
    brandColor: "#f22f46"
  },
  {
    id: "telnyx",
    name: "Telnyx",
    description: "Global connectivity platform for voice and messaging",
    icon: MessageSquare,
    status: "available",
    category: "Communication",
    brandColor: "#00d9ff"
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Connect WhatsApp Business for messaging capabilities",
    icon: MessageSquare,
    status: "available",
    category: "Communication",
    brandColor: "#25D366"
  },
  // Calendar Integrations
  {
    id: "calcom",
    name: "Cal.com",
    description: "Open-source scheduling infrastructure for everyone",
    icon: Calendar,
    status: "available",
    category: "Calendar",
    brandColor: "#292929"
  }
];

export function ApiIntegrations() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("all");
  const [twilioIntegrations, setTwilioIntegrations] = useState<TwilioIntegration[]>([]);
  const [calendarIntegrations, setCalendarIntegrations] = useState<UserCalendarCredentials[]>([]);
  const [whatsappIntegrations, setWhatsappIntegrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTwilioDetails, setShowTwilioDetails] = useState(false);
  const [showCalendarDetails, setShowCalendarDetails] = useState(false);
  const [showWhatsappDetails, setShowWhatsappDetails] = useState(false);

  // Load credentials on component mount
  useEffect(() => {
    loadTwilioCredentials();
    loadCalendarCredentials();
    loadWhatsAppCredentials();
  }, []);

  const loadTwilioCredentials = async () => {
    try {
      setIsLoading(true);
      const credentials = await TwilioCredentialsService.getAllCredentials();
      console.log("Loaded Twilio credentials:", credentials);
      
      const twilioIntegrations: TwilioIntegration[] = credentials.map(cred => ({
        id: cred.id,
        name: "Twilio",
        description: `Voice and SMS communications${cred.trunk_sid ? ' with auto-generated trunk' : ''}`,
        status: "connected" as const,
        lastUsed: formatLastUsed(cred.updated_at),
        details: {
          account: maskAccountSid(cred.account_sid),
          label: cred.label,
          trunkSid: cred.trunk_sid,
        },
      }));

      console.log("Processed Twilio integrations:", twilioIntegrations);
      setTwilioIntegrations(twilioIntegrations);
    } catch (error) {
      console.error("Error loading Twilio credentials:", error);
      toast({
        title: "Error",
        description: "Failed to load Twilio credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCalendarCredentials = async () => {
    try {
      const credentials = await CalendarCredentialsService.getAllCredentials();
      console.log("Loaded calendar credentials:", credentials);
      setCalendarIntegrations(credentials);
    } catch (error) {
      console.error("Error loading calendar credentials:", error);
      toast({
        title: "Error",
        description: "Failed to load calendar credentials.",
        variant: "destructive",
      });
    }
  };

  const loadWhatsAppCredentials = async () => {
    try {
      const credentials = await WhatsAppCredentialsService.getAllCredentials();
      console.log("Loaded WhatsApp credentials:", credentials);
      
      const whatsappIntegrations = credentials.map(cred => ({
        id: cred.id,
        name: "WhatsApp Business",
        description: `WhatsApp Business messaging${cred.label ? ` - ${cred.label}` : ''}`,
        status: "connected" as const,
        lastUsed: formatLastUsed(cred.updated_at),
        details: {
          number: maskWhatsAppNumber(cred.whatsapp_number),
          label: cred.label,
        },
      }));

      setWhatsappIntegrations(whatsappIntegrations);
    } catch (error) {
      console.error("Error loading WhatsApp credentials:", error);
      toast({
        title: "Error",
        description: "Failed to load WhatsApp credentials.",
        variant: "destructive",
      });
    }
  };

  // Helper functions
  const maskAccountSid = (accountSid: string): string => {
    if (accountSid.length <= 8) return accountSid;
    return accountSid.substring(0, 2) + "*".repeat(accountSid.length - 6) + accountSid.substring(accountSid.length - 4);
  };

  const formatLastUsed = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const maskWhatsAppNumber = (number: string): string => {
    if (number.length <= 4) return number;
    return number.slice(0, -4).replace(/./g, '*') + number.slice(-4);
  };
  const updatedIntegrations = integrations.map(integration => {
    if (integration.id === "twilio") {
      return {
        ...integration,
        status: twilioIntegrations.length > 0 ? "connected" : "available"
      };
    }
    if (integration.id === "calcom") {
      return {
        ...integration,
        status: calendarIntegrations.length > 0 ? "connected" : "available"
      };
    }
    if (integration.id === "whatsapp") {
      return {
        ...integration,
        status: whatsappIntegrations.length > 0 ? "connected" : "available"
      };
    }
    return integration;
  });

  const filteredIntegrations = activeCategory === "all" 
    ? updatedIntegrations 
    : updatedIntegrations.filter(integration => integration.category.toLowerCase() === activeCategory);

  const getCategoryCount = (category: string) => {
    return category === "all" 
      ? updatedIntegrations.length 
      : updatedIntegrations.filter(integration => integration.category.toLowerCase() === category).length;
  };

  const handleTwilioConnect = async (data: { accountSid: string; authToken: string; label: string }) => {
    console.log("handleTwilioConnect called with data:", data);
    try {
      // Test credentials before saving
      console.log("Testing credentials...");
      const isValid = await TwilioCredentialsService.testCredentials(data);
      console.log("Credentials valid:", isValid);
      if (!isValid) {
        toast({
          title: "Invalid credentials",
          description: "Please check your Twilio credentials and try again.",
          variant: "destructive",
        });
        throw new Error("Invalid credentials");
      }

      console.log("Saving credentials...");
      await TwilioCredentialsService.saveCredentials(data);
      console.log("Credentials saved successfully");
      
      console.log("Loading Twilio credentials...");
      await loadTwilioCredentials();
      console.log("Twilio credentials loaded");
      
      toast({
        title: "Twilio connected",
        description: "Your Twilio account has been connected successfully. A main trunk will be created automatically.",
      });
    } catch (error) {
      console.error("Error connecting Twilio:", error);
      toast({
        title: "Connection failed",
        description: "Failed to connect your Twilio account. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to prevent dialog from closing
    }
  };

  const handleRemoveIntegration = async (id: string) => {
    try {
      await TwilioCredentialsService.deleteCredentials(id);
      await loadTwilioCredentials();
      
      toast({
        title: "Integration removed",
        description: "The Twilio integration has been removed successfully.",
      });
    } catch (error) {
      console.error("Error removing integration:", error);
      toast({
        title: "Removal failed",
        description: "Failed to remove the integration. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log("twilioIntegrations updated:", twilioIntegrations);
  }, [twilioIntegrations]);
  

  const handleRefreshIntegration = async (id: string) => {
    try {
      await TwilioCredentialsService.setActiveCredentials(id);
      await loadTwilioCredentials();
      
      toast({
        title: "Integration refreshed",
        description: "The Twilio integration has been set as active.",
      });
    } catch (error) {
      console.error("Error refreshing integration:", error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh the integration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCalendarConnect = async (data: CalendarCredentialsInput) => {
    console.log("handleCalendarConnect called with data:", data);
    try {
      await CalendarCredentialsService.saveCredentials(data);
      await loadCalendarCredentials();
      
      toast({
        title: "Calendar connected",
        description: "Your calendar integration has been connected successfully.",
      });
    } catch (error) {
      console.error("Error connecting calendar:", error);
      toast({
        title: "Connection failed",
        description: "Failed to connect your calendar. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleRemoveCalendarIntegration = async (id: string) => {
    try {
      await CalendarCredentialsService.deleteCredentials(id);
      await loadCalendarCredentials();
      
      toast({
        title: "Integration removed",
        description: "The calendar integration has been removed successfully.",
      });
    } catch (error) {
      console.error("Error removing calendar integration:", error);
      toast({
        title: "Removal failed",
        description: "Failed to remove the calendar integration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshCalendarIntegration = async (id: string) => {
    try {
      await CalendarCredentialsService.setActiveCredentials(id);
      await loadCalendarCredentials();
      
      toast({
        title: "Integration refreshed",
        description: "The calendar integration has been set as active.",
      });
    } catch (error) {
      console.error("Error refreshing calendar integration:", error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh the calendar integration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleIntegrationClick = (integration: typeof integrations[0]) => {
    if (integration.id === "twilio") {
      // Toggle Twilio details visibility
      setShowTwilioDetails(!showTwilioDetails);
      return;
    }
    
    if (integration.id === "calcom") {
      // Toggle calendar details visibility
      setShowCalendarDetails(!showCalendarDetails);
      return;
    }
    
    if (integration.id === "whatsapp") {
      // Toggle WhatsApp details visibility
      setShowWhatsappDetails(!showWhatsappDetails);
      return;
    }
    
    // For other integrations, show coming soon or redirect
    console.log(`Connecting to ${integration.name}`);
    toast({
      title: "Coming Soon",
      description: `${integration.name} integration is coming soon!`,
    });
  };

  const IntegrationCard = ({ integration }: { integration: typeof integrations[0] }) => {
    const IconComponent = integration.icon;
    
    // Check if integration is actually connected
    const isConnected = integration.status === "connected";

    
    // Debug logging for integrations
    if (integration.id === "twilio") {
      console.log("Twilio integration debug:", {
        twilioIntegrationsLength: twilioIntegrations.length,
        twilioIntegrations,
        isConnected,
        isLoading
      });
    }
    
    if (integration.id === "calcom") {
      console.log("Calendar integration debug:", {
        calendarIntegrationsLength: calendarIntegrations.length,
        calendarIntegrations,
        isConnected,
        isLoading
      });
    }
    
    return (
      <Card className="group relative border-border/60 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 h-full">
        <div className="p-4 h-full flex flex-col">
          {/* Header with Icon and Status */}
          <div className="flex items-start justify-between mb-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300"
              style={{ backgroundColor: `${integration.brandColor}15` }}
            >
              <IconComponent 
                className="w-4 h-4" 
                style={{ color: integration.brandColor }}
              />
            </div>
            
            {isConnected && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs px-1.5 py-0.5">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                Connected
              </Badge>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 mb-4">
          <h3
  className="font-semibold text-foreground text-sm mb-2 group-hover:text-primary transition-colors leading-tight"
  onClick={integration.id === "twilio" ? () => handleIntegrationClick(integration) : undefined}
>
  {integration.name}
</h3>

            <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
              {integration.description}
            </p>
          </div>
          
          {/* Action Button */}
          <div className="mt-auto">
            {integration.id === "twilio" ? (
              <TwilioAuthDialog onSuccess={handleTwilioConnect}>
                <Button
                  variant="outline"
                  className="w-full text-sm h-8 relative z-10 flex items-center justify-center gap-1.5"
                  size="sm"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Manage
                </Button>
              </TwilioAuthDialog>
            ) : integration.id === "calcom" ? (
              <CalendarAuthDialog onSuccess={handleCalendarConnect}>
                <Button
                  variant="outline"
                  className="w-full text-sm h-8 relative z-10 flex items-center justify-center gap-1.5"
                  size="sm"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Manage
                </Button>
              </CalendarAuthDialog>
            ) : (
              <Button 
                variant={isConnected ? "outline" : "default"}
                className="w-full text-sm h-8 relative z-10 flex items-center justify-center gap-1.5"
                size="sm"
                onClick={() => handleIntegrationClick(integration)}
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Manage
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    Connect
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Integrations</h2>
        <p className="text-muted-foreground">
          Connect your favorite tools and services to streamline your workflow.
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-8 h-12 glass-input">
          <TabsTrigger value="all" className="text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            All ({getCategoryCount("all")})
          </TabsTrigger>
          <TabsTrigger value="crm" className="text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            CRM ({getCategoryCount("crm")})
          </TabsTrigger>
          <TabsTrigger value="communication" className="text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            Communication ({getCategoryCount("communication")})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            Calendar ({getCategoryCount("calendar")})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="mt-0">
          {filteredIntegrations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No integrations available in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-6xl items-stretch">
              {filteredIntegrations.map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Twilio Integration Details - Only show when toggled */}
      {showTwilioDetails && twilioIntegrations.length > 0 && (
        <div className="mt-8 transition-all duration-300 ease-in-out">
          <h3 className="text-lg font-semibold text-foreground mb-4">Connected Twilio Accounts</h3>
          <TwilioIntegrationCard 
            integrations={twilioIntegrations}
            onSuccess={handleTwilioConnect}
            onRemove={handleRemoveIntegration}
            onRefresh={handleRefreshIntegration}
          />
        </div>
      )}
      
      {/* Calendar Integration Details - Only show when toggled */}
      {showCalendarDetails && calendarIntegrations.length > 0 && (
        <div className="mt-8 transition-all duration-300 ease-in-out">
          <h3 className="text-lg font-semibold text-foreground mb-4">Connected Calendar Accounts</h3>
          <CalendarIntegrationCard 
            integrations={calendarIntegrations}
            onSuccess={handleCalendarConnect}
            onRemove={handleRemoveCalendarIntegration}
            onRefresh={handleRefreshCalendarIntegration}
          />
        </div>
      )}
      
      {/* WhatsApp Integration Details - Only show when toggled */}
      {showWhatsappDetails && whatsappIntegrations.length > 0 && (
        <div className="mt-8 transition-all duration-300 ease-in-out">
          <h3 className="text-lg font-semibold text-foreground mb-4">Connected WhatsApp Accounts</h3>
          <WhatsAppIntegrationCard 
            integrations={whatsappIntegrations}
            onIntegrationsChange={setWhatsappIntegrations}
          />
        </div>
      )}
      
      <SecurityCard />
      
      <div className="mb-20"></div>
    </div>
  );
}
