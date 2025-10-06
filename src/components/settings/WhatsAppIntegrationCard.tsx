import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Plus, Settings, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppCredentialsService, type UserWhatsAppCredentials, type WhatsAppCredentialsInput } from "@/lib/whatsapp-credentials";

interface WhatsAppIntegration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "available";
  lastUsed?: string;
  details?: {
    number: string;
    label: string;
  };
}

interface WhatsAppIntegrationCardProps {
  integrations: WhatsAppIntegration[];
  onIntegrationsChange: (integrations: WhatsAppIntegration[]) => void;
}

export function WhatsAppIntegrationCard({ integrations, onIntegrationsChange }: WhatsAppIntegrationCardProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<WhatsAppCredentialsInput>({
    whatsapp_number: "",
    whatsapp_key: "",
    label: ""
  });

  const handleSaveCredentials = async () => {
    try {
      setIsLoading(true);
      
      // Validate credentials
      const validation = WhatsAppCredentialsService.validateCredentials(formData);
      if (!validation.isValid) {
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }

      await WhatsAppCredentialsService.saveCredentials(formData);
      
      toast({
        title: "Success",
        description: "WhatsApp credentials saved successfully!",
      });

      // Reset form and close dialog
      setFormData({ whatsapp_number: "", whatsapp_key: "", label: "" });
      setIsDialogOpen(false);
      
      // Reload integrations
      await loadWhatsAppCredentials();
    } catch (error) {
      console.error("Error saving WhatsApp credentials:", error);
      toast({
        title: "Error",
        description: "Failed to save WhatsApp credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadWhatsAppCredentials = async () => {
    try {
      const credentials = await WhatsAppCredentialsService.getAllCredentials();
      
      const whatsappIntegrations: WhatsAppIntegration[] = credentials.map(cred => ({
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

      onIntegrationsChange(whatsappIntegrations);
    } catch (error) {
      console.error("Error loading WhatsApp credentials:", error);
    }
  };

  const formatLastUsed = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const maskWhatsAppNumber = (number: string): string => {
    if (number.length <= 4) return number;
    return number.slice(0, -4).replace(/./g, '*') + number.slice(-4);
  };

  const handleDeleteCredentials = async (credentialsId: string) => {
    try {
      await WhatsAppCredentialsService.deleteCredentials(credentialsId);
      
      toast({
        title: "Success",
        description: "WhatsApp credentials deleted successfully!",
      });
      
      // Reload integrations
      await loadWhatsAppCredentials();
    } catch (error) {
      console.error("Error deleting WhatsApp credentials:", error);
      toast({
        title: "Error",
        description: "Failed to delete WhatsApp credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageSquare className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-lg font-medium text-green-900">
              WhatsApp Business
            </CardTitle>
            <CardDescription className="text-green-700">
              Connect WhatsApp Business for messaging capabilities
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Communication
          </Badge>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-1" />
                Add Credentials
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add WhatsApp Business Credentials</DialogTitle>
                <DialogDescription>
                  Enter your WhatsApp Business API credentials to enable messaging capabilities.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    placeholder="e.g., Main WhatsApp Business"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_number">WhatsApp Business Number</Label>
                  <Input
                    id="whatsapp_number"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_key">WhatsApp Business API Key</Label>
                  <Input
                    id="whatsapp_key"
                    type="password"
                    placeholder="Enter your API key"
                    value={formData.whatsapp_key}
                    onChange={(e) => setFormData({ ...formData, whatsapp_key: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveCredentials} 
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? "Saving..." : "Save Credentials"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {integrations.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="h-12 w-12 text-green-300 mx-auto mb-3" />
            <p className="text-green-600 font-medium mb-1">No WhatsApp credentials configured</p>
            <p className="text-green-500 text-sm">
              Add your WhatsApp Business credentials to enable messaging capabilities
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">{integration.details?.label}</p>
                    <p className="text-sm text-green-600">{integration.details?.number}</p>
                    <p className="text-xs text-green-500">Last used: {integration.lastUsed}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteCredentials(integration.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
