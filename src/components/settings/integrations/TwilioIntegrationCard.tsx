import { useState } from "react";
import { TwilioIntegration } from "./types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Phone,
  Check,
  RefreshCw,
  Trash2,
  Settings as SettingsIcon,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface TwilioIntegrationCardProps {
  integrations: TwilioIntegration[];
  onSuccess: (data: any) => void;
  onRemove: (id: string) => void;
  onRefresh: (id: string) => void;
}

export function TwilioIntegrationCard({
  integrations,
  onSuccess,
  onRemove,
  onRefresh,
}: TwilioIntegrationCardProps) {
  return (
    <div className="space-y-4">
      {integrations.map((integration) => (
        <div 
          key={integration.id} 
          className="rounded-lg border p-4 transition-all hover:bg-secondary/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium flex items-center">
                  {integration.details.label}
                  <span className="ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-green-500/10 text-green-500 dark:bg-green-500/20">
                    <Check className="mr-0.5 h-3 w-3" />
                    Active
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Account: {integration.details.account} • {integration.details.trunkSid ? `Trunk: ${integration.details.trunkSid}` : 'Auto-generated trunk'} • Last used: {integration.lastUsed}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onRefresh(integration.id)}
              >
                <span className="sr-only">Refresh</span>
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                    <span className="sr-only">Remove</span>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Integration</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove this Twilio integration? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => onRemove(integration.id)}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto justify-start"
              size="sm"
            >
              <SettingsIcon className="mr-2 h-3.5 w-3.5" />
              Configure Settings
              <ChevronRight className="ml-auto h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full sm:w-auto justify-start"
              size="sm"
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Twilio Console
              <ChevronRight className="ml-auto h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
