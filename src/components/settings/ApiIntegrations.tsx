import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TwilioIntegrationCard } from "./integrations/TwilioIntegrationCard";
import { SecurityCard } from "./integrations/SecurityCard";
import { MainHeading, BodyText } from "@/components/ui/typography";
import { TwilioAuthDialog } from "./TwilioAuthDialog";
import type { TwilioIntegration, TwilioCredentials } from "./integrations/types";
import { TwilioCredentialsService, type UserTwilioCredentials } from "@/lib/twilio-credentials";

export function ApiIntegrations() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<TwilioIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load Twilio credentials on component mount
  useEffect(() => {
    loadTwilioCredentials();
  }, []);

  const loadTwilioCredentials = async () => {
    try {
      setIsLoading(true);
      const credentials = await TwilioCredentialsService.getAllCredentials();
      
      const twilioIntegrations: TwilioIntegration[] = credentials.map(cred => ({
        id: cred.id,
        name: "Twilio",
        description: "Voice and SMS communications",
        status: "connected" as const,
        lastUsed: formatLastUsed(cred.updated_at),
        details: {
          account: maskAccountSid(cred.account_sid),
          label: cred.label,
          trunkSid: cred.trunk_sid,
        },
      }));

      setIntegrations(twilioIntegrations);
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

  const handleTwilioConnect = async (data: TwilioCredentials) => {
    try {
      // Test credentials before saving
      const isValid = await TwilioCredentialsService.testCredentials(data);
      if (!isValid) {
        toast({
          title: "Invalid credentials",
          description: "Please check your Twilio credentials and try again.",
          variant: "destructive",
        });
        return;
      }

      await TwilioCredentialsService.saveCredentials(data);
      await loadTwilioCredentials();
      
      toast({
        title: "Twilio connected",
        description: "Your Twilio account has been connected successfully.",
      });
    } catch (error) {
      console.error("Error connecting Twilio:", error);
      toast({
        title: "Connection failed",
        description: "Failed to connect your Twilio account. Please try again.",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extralight tracking-tight text-foreground">API Integrations</h2>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Connect external services and manage API integrations
        </p>
      </div>
      
      <Card className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-foreground">
                Twilio Integration
              </h3>
              <p className="text-muted-foreground text-sm">
                Connect your Twilio account for voice and SMS capabilities
              </p>
            </div>
            <TwilioAuthDialog onSuccess={handleTwilioConnect} />
          </div>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] border-dashed p-8 text-center bg-white/[0.01]">
              <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2 text-foreground">No Twilio accounts connected</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Connect your Twilio account to enable voice and SMS functionality.
              </p>
            </div>
          ) : (
            <TwilioIntegrationCard 
              integrations={integrations}
              onSuccess={handleTwilioConnect}
              onRemove={handleRemoveIntegration}
              onRefresh={handleRefreshIntegration}
            />
          )}
        </CardContent>
      </Card>
      
      <SecurityCard />
      
      <div className="mb-20"></div>
    </div>
  );
}
