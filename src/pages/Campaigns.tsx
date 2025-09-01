import { useState } from 'react';
import DashboardLayout from "@/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Pause, Trash2, Plus, BarChart3 } from "lucide-react";
import { TermsOfUseDialog } from "@/components/campaigns/TermsOfUseDialog";
import { CampaignSettingsDialog } from "@/components/campaigns/CampaignSettingsDialog";

// Mock data for campaigns
interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  dailyCap: number;
  agent: string;
  list: string;
  dials: number;
  pickups: number;
  doNotCall: number;
  outcomes: {
    interested: number;
    notInterested: number;
    callback: number;
  };
  totalUsage: number;
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Q4 Sales Outreach',
    status: 'active',
    dailyCap: 100,
    agent: 'Sarah Johnson',
    list: 'Sales Prospects',
    dials: 847,
    pickups: 234,
    doNotCall: 12,
    outcomes: {
      interested: 45,
      notInterested: 156,
      callback: 33
    },
    totalUsage: 1250
  },
  {
    id: '2',
    name: 'Customer Support Follow-up',
    status: 'paused',
    dailyCap: 50,
    agent: 'Mike Chen',
    list: 'Support Tickets',
    dials: 156,
    pickups: 89,
    doNotCall: 3,
    outcomes: {
      interested: 67,
      notInterested: 18,
      callback: 4
    },
    totalUsage: 320
  }
];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [termsOpen, setTermsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleNewCampaign = () => {
    setTermsOpen(true);
  };

  const handleTermsAccepted = () => {
    setTermsOpen(false);
    setSettingsOpen(true);
  };

  const handleCampaignCreated = (campaignData: any) => {
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: campaignData.name,
      status: 'paused',
      dailyCap: campaignData.dailyCap,
      agent: campaignData.agent,
      list: campaignData.contactList,
      dials: 0,
      pickups: 0,
      doNotCall: 0,
      outcomes: {
        interested: 0,
        notInterested: 0,
        callback: 0
      },
      totalUsage: 0
    };

    setCampaigns(prev => [...prev, newCampaign]);
    setSettingsOpen(false);
  };

  const toggleCampaignStatus = (id: string) => {
    setCampaigns(prev => prev.map(campaign => 
      campaign.id === id 
        ? { ...campaign, status: campaign.status === 'active' ? 'paused' : 'active' as 'active' | 'paused' }
        : campaign
    ));
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const variants = {
      active: { variant: 'default' as const, className: 'bg-success/10 text-success border-success/20 hover:bg-success/20' },
      paused: { variant: 'secondary' as const, className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20' },
      completed: { variant: 'outline' as const, className: 'bg-muted/10 text-muted-foreground border-muted/30 hover:bg-muted/20' }
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (campaigns.length === 0) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
          <div className="container mx-auto px-[var(--space-lg)]">
            <div className="max-w-5xl mx-auto">
              <ThemeSection spacing="lg" className="flex flex-col items-center justify-center min-h-[70vh] text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-[var(--space-xl)]"
                >
                  <div className="space-y-[var(--space-md)]">
                    <BarChart3 className="w-16 h-16 mx-auto text-primary/60" />
                    <h1 className="text-5xl font-extralight tracking-tight text-foreground">
                      Create And Launch Your First Campaign
                    </h1>
                    <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
                      Launch your AI agents and start creating amazing campaigns that will help you connect with your customers in a meaningful way.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleNewCampaign}
                    size="lg"
                    className="px-8 py-3 text-lg font-medium"
                  >
                    Launch a campaign
                  </Button>
                </motion.div>
              </ThemeSection>
            </div>
          </div>

          <TermsOfUseDialog 
            open={termsOpen} 
            onOpenChange={setTermsOpen}
            onAccepted={handleTermsAccepted}
          />
          
          <CampaignSettingsDialog 
            open={settingsOpen} 
            onOpenChange={setSettingsOpen}
            onSave={handleCampaignCreated}
          />
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
        <div className="container mx-auto px-[var(--space-lg)]">
          <div className="max-w-7xl mx-auto">
            <ThemeSection spacing="lg">
              <div className="flex flex-row items-center justify-between">
                <div className="flex flex-col space-y-[var(--space-md)]">
                  <h1 className="text-4xl font-extralight tracking-tight text-foreground">
                    Campaigns
                  </h1>
                  <p className="text-muted-foreground text-lg font-light">
                    Manage and monitor your AI agent campaigns
                  </p>
                </div>
                
                <Button onClick={handleNewCampaign} className="px-6">
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </div>

              <ThemeCard variant="glass" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Daily Cap</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>List</TableHead>
                        <TableHead className="text-right">Dials</TableHead>
                        <TableHead className="text-right">Pickups</TableHead>
                        <TableHead className="text-right">Do Not Call</TableHead>
                        <TableHead className="text-right">Outcomes</TableHead>
                        <TableHead className="text-right">Total Usage</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            {getStatusBadge(campaign.status)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {campaign.name}
                          </TableCell>
                          <TableCell>
                            {campaign.dailyCap}
                          </TableCell>
                          <TableCell>
                            {campaign.agent}
                          </TableCell>
                          <TableCell>
                            {campaign.list}
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.dials}
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.pickups}
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.doNotCall}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col text-xs space-y-1">
                              <span className="text-success">I: {campaign.outcomes.interested}</span>
                              <span className="text-destructive">NI: {campaign.outcomes.notInterested}</span>
                              <span className="text-warning">CB: {campaign.outcomes.callback}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.totalUsage}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCampaignStatus(campaign.id)}
                                className="text-theme-secondary hover:text-theme-primary"
                              >
                                {campaign.status === 'active' ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteCampaign(campaign.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ThemeCard>
            </ThemeSection>
          </div>
        </div>

        <TermsOfUseDialog 
          open={termsOpen} 
          onOpenChange={setTermsOpen}
          onAccepted={handleTermsAccepted}
        />
        
        <CampaignSettingsDialog 
          open={settingsOpen} 
          onOpenChange={setSettingsOpen}
          onSave={handleCampaignCreated}
        />
      </ThemeContainer>
    </DashboardLayout>
  );
}