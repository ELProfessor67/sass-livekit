import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TwilioIntegrationCard } from "./integrations/TwilioIntegrationCard";
import { SecurityCard } from "./integrations/SecurityCard";
import { MainHeading, BodyText } from "@/components/ui/typography";
import { TwilioAuthDialog } from "./TwilioAuthDialog";
import type { TwilioIntegration } from "./integrations/types";

const mockIntegrations = [
  {
    id: "1",
    name: "Twilio",
    description: "Voice and SMS communications",
    status: "connected",
    lastUsed: "3 hours ago",
    details: {
      account: "AC********1234",
      label: "Main Twilio Account",
    },
  }
] as TwilioIntegration[];

export function ApiIntegrations() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<TwilioIntegration[]>(mockIntegrations);
  
  const handleTwilioConnect = (data: any) => {
    const newIntegration = {
      id: Math.random().toString(),
      name: "Twilio",
      description: "Voice and SMS communications",
      status: "connected",
      lastUsed: "Just now",
      details: {
        account: `AC****${data.accountSid.slice(-4)}`,
        label: data.label,
      },
    } as TwilioIntegration;
    
    setIntegrations([...integrations, newIntegration]);
  };
  
  const handleRemoveIntegration = (id: string) => {
    setIntegrations(integrations.filter(integration => integration.id !== id));
    
    toast({
      title: "Integration removed",
      description: "The integration has been successfully removed.",
    });
  };
  
  const handleRefreshIntegration = (id: string) => {
    toast({
      title: "Integration refreshed",
      description: "The integration credentials have been refreshed.",
    });
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
