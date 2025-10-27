import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarAuthDialog } from "./CalendarAuthDialog";
import { CalendarCredentialsService, type UserCalendarCredentials } from "@/lib/calendar-credentials";
import { Calendar, CheckCircle2, Trash2, RefreshCw, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CalendarIntegrationCardProps {
  integrations: UserCalendarCredentials[];
  onSuccess: (credentials: any) => void;
  onRemove: (id: string) => void;
  onRefresh: (id: string) => void;
}

export function CalendarIntegrationCard({ 
  integrations, 
  onSuccess, 
  onRemove, 
  onRefresh 
}: CalendarIntegrationCardProps) {
  const { toast } = useToast();

  const formatLastUsed = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const maskApiKey = (apiKey: string): string => {
    if (apiKey.length <= 8) return apiKey;
    return apiKey.substring(0, 4) + "*".repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  };

  const getProviderInfo = (provider: string) => {
    const providers = CalendarCredentialsService.getAvailableProviders();
    return providers.find(p => p.id === provider) || { name: provider, description: '' };
  };

  if (integrations.length === 0) {
    return (
      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Calendar Integrations</h3>
          <p className="text-muted-foreground mb-4">
            Connect your calendar to enable scheduling features for your assistants.
          </p>
          <CalendarAuthDialog onSuccess={onSuccess}>
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              Connect Calendar
            </Button>
          </CalendarAuthDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {integrations.map((integration) => {
        const providerInfo = getProviderInfo(integration.provider);
        
        return (
          <Card key={integration.id} className="border-border/60 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{providerInfo.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{integration.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {integration.is_active && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Integration Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">API Key:</span>
                    <p className="font-mono text-xs">{maskApiKey(integration.api_key)}</p>
                  </div>
                  {integration.event_type_slug && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Event Type:</span>
                      <p className="text-xs">{integration.event_type_slug}</p>
                    </div>
                  )}
                </div>

                {/* Last Used */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Last used {formatLastUsed(integration.updated_at)}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <CalendarAuthDialog onSuccess={onSuccess}>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Calendar className="mr-2 h-3 w-3" />
                      Add Another
                    </Button>
                  </CalendarAuthDialog>
                  
                  {!integration.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRefresh(integration.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemove(integration.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
