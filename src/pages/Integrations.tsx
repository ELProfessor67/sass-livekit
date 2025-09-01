import React from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Zap, Phone, Mail, MessageSquare, Database, Globe, Slack, Webhook } from "lucide-react";

const integrations = [
  {
    id: "twilio",
    name: "Twilio",
    description: "Voice and SMS communication platform",
    icon: Phone,
    status: "connected",
    category: "Communication"
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Email delivery and marketing platform",
    icon: Mail,
    status: "available",
    category: "Email"
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team collaboration and messaging",
    icon: Slack,
    status: "available",
    category: "Communication"
  },
  {
    id: "webhook",
    name: "Webhooks",
    description: "Custom HTTP callbacks for real-time events",
    icon: Webhook,
    status: "configured",
    category: "Developer"
  },
  {
    id: "crm",
    name: "CRM Integration",
    description: "Connect with your customer relationship management system",
    icon: Database,
    status: "available",
    category: "Data"
  },
  {
    id: "api",
    name: "REST API",
    description: "Direct API access to all platform features",
    icon: Globe,
    status: "active",
    category: "Developer"
  }
];

export default function Integrations() {
  const getStatusBadge = (status: string) => {
    const variants = {
      connected: { variant: 'default' as const, className: 'bg-success/10 text-success border-success/20' },
      configured: { variant: 'default' as const, className: 'bg-primary/10 text-primary border-primary/20' },
      active: { variant: 'default' as const, className: 'bg-info/10 text-info border-info/20' },
      available: { variant: 'secondary' as const, className: 'bg-muted/10 text-muted-foreground border-muted/30' }
    };

    const config = variants[status as keyof typeof variants] || variants.available;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Integrations</h1>
          <p className="text-muted-foreground">Connect your AI Call Center with external services and APIs</p>
        </div>

        <div className="grid gap-6">
          {Object.entries(
            integrations.reduce((acc, integration) => {
              if (!acc[integration.category]) {
                acc[integration.category] = [];
              }
              acc[integration.category].push(integration);
              return acc;
            }, {} as Record<string, typeof integrations>)
          ).map(([category, categoryIntegrations]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold text-foreground mb-4">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryIntegrations.map((integration) => {
                  const IconComponent = integration.icon;
                  return (
                    <Card key={integration.id} className="border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{integration.name}</CardTitle>
                            </div>
                          </div>
                          {getStatusBadge(integration.status)}
                        </div>
                        <CardDescription className="text-sm">
                          {integration.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={integration.status === 'connected' || integration.status === 'configured' || integration.status === 'active'}
                              disabled={integration.status === 'available'}
                            />
                            <span className="text-sm text-muted-foreground">
                              {integration.status === 'available' ? 'Available' : 'Enabled'}
                            </span>
                          </div>
                          <Button 
                            variant={integration.status === 'available' ? 'default' : 'outline'} 
                            size="sm"
                          >
                            {integration.status === 'available' ? 'Connect' : 'Configure'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}