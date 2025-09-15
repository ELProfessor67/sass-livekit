import { useState, useEffect } from 'react';
import DashboardLayout from "@/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Pause, Trash2, Plus, BarChart3, Eye } from "lucide-react";
import { TermsOfUseDialog } from "@/components/campaigns/TermsOfUseDialog";
import { CampaignSettingsDialog } from "@/components/campaigns/CampaignSettingsDialog";
import { CampaignDetailsDialog } from "@/components/campaigns/CampaignDetailsDialog";
import { DeleteCampaignDialog } from "@/components/campaigns/DeleteCampaignDialog";
import { fetchCampaigns, Campaign } from "@/lib/api/campaigns/fetchCampaigns";
import { saveCampaign, SaveCampaignRequest } from "@/lib/api/campaigns/saveCampaign";
import { startCampaign } from "@/lib/api/campaigns/startCampaign";
import { pauseCampaign } from "@/lib/api/campaigns/pauseCampaign";
import { resumeCampaign } from "@/lib/api/campaigns/resumeCampaign";
import { stopCampaign } from "@/lib/api/campaigns/stopCampaign";
import { deleteCampaign as deleteCampaignAPI } from "@/lib/api/campaigns/deleteCampaign";
import { getCampaignStatus } from "@/lib/api/campaigns/getCampaignStatus";
import { useAuth } from "@/contexts/AuthContext";

// Campaign interface imported from API

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
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [termsOpen, setTermsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Load campaigns from database
  useEffect(() => {
    const loadCampaigns = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetchCampaigns();
        setCampaigns(response.campaigns);
      } catch (error) {
        console.error('Error loading campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [user?.id]);

  const handleNewCampaign = () => {
    setTermsOpen(true);
  };

  const handleTermsAccepted = () => {
    setTermsOpen(false);
    setSettingsOpen(true);
  };

  const handleCampaignCreated = async (campaignData: any) => {
    if (!user?.id) return;

    try {
      const saveData: SaveCampaignRequest = {
        name: campaignData.name,
        assistantId: campaignData.assistantId,
        contactSource: campaignData.contactSource,
        contactListId: campaignData.contactListId,
        csvFileId: campaignData.csvFileId,
        dailyCap: campaignData.dailyCap,
        callingDays: campaignData.callingDays,
        startHour: campaignData.startHour,
        endHour: campaignData.endHour,
        campaignPrompt: campaignData.campaignPrompt,
        userId: user.id
      };

      const result = await saveCampaign(saveData);
      
      if (result.success) {
        // Reload campaigns from database
        const response = await fetchCampaigns();
        setCampaigns(response.campaigns);
        setSettingsOpen(false);
      } else {
        console.error('Error saving campaign:', result.error);
        alert('Error saving campaign: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Error creating campaign: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const toggleCampaignStatus = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return;

    try {
      if (campaign.execution_status === 'running') {
        // Pause the campaign
        const result = await pauseCampaign({ campaignId: id });
        if (result.success) {
          setCampaigns(prev => prev.map(c => 
            c.id === id 
              ? { ...c, execution_status: 'paused' as const }
              : c
          ));
        } else {
          console.error('Error pausing campaign:', result.error);
        }
      } else if (campaign.execution_status === 'paused') {
        // Resume the campaign
        const result = await resumeCampaign({ campaignId: id });
        if (result.success) {
          setCampaigns(prev => prev.map(c => 
            c.id === id 
              ? { ...c, execution_status: 'running' as const }
              : c
          ));
        } else {
          console.error('Error resuming campaign:', result.error);
        }
      } else if (campaign.execution_status === 'idle') {
        // Start the campaign
        const result = await startCampaign({ campaignId: id });
        if (result.success) {
          setCampaigns(prev => prev.map(c => 
            c.id === id 
              ? { ...c, execution_status: 'running' as const }
              : c
          ));
        } else {
          console.error('Error starting campaign:', result.error);
        }
      }
    } catch (error) {
      console.error('Error toggling campaign status:', error);
    }
  };

  const handleDeleteCampaign = (id: string, name: string) => {
    setSelectedCampaignId(id);
    setSelectedCampaignName(name);
    setDeleteOpen(true);
  };

  const confirmDeleteCampaign = async () => {
    if (!selectedCampaignId) return;

    setDeleting(true);
    try {
      const result = await deleteCampaignAPI({ campaignId: selectedCampaignId });
      
      if (result.success) {
        // Remove from local state
        setCampaigns(prev => prev.filter(campaign => campaign.id !== selectedCampaignId));
        setDeleteOpen(false);
        setSelectedCampaignId('');
        setSelectedCampaignName('');
      } else {
        console.error('Error deleting campaign:', result.error);
        alert('Error deleting campaign: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Error deleting campaign: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  const openCampaignDetails = (campaignId: string, campaignName: string) => {
    setSelectedCampaignId(campaignId);
    setSelectedCampaignName(campaignName);
    setDetailsOpen(true);
  };

  const getStatusBadge = (executionStatus: Campaign['execution_status']) => {
    const variants = {
      idle: { variant: 'outline' as const, className: 'bg-muted/10 text-muted-foreground border-muted/30 hover:bg-muted/20' },
      running: { variant: 'default' as const, className: 'bg-success/10 text-success border-success/20 hover:bg-success/20' },
      paused: { variant: 'secondary' as const, className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20' },
      completed: { variant: 'outline' as const, className: 'bg-muted/10 text-muted-foreground border-muted/30 hover:bg-muted/20' },
      error: { variant: 'destructive' as const, className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20' }
    };

    const config = variants[executionStatus] || variants.idle;
    return (
      <Badge variant={config.variant} className={config.className}>
        {executionStatus.charAt(0).toUpperCase() + executionStatus.slice(1)}
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
                        <TableHead>Assistant</TableHead>
                        <TableHead>Contact Source</TableHead>
                        <TableHead className="text-right">Dials</TableHead>
                        <TableHead className="text-right">Pickups</TableHead>
                        <TableHead className="text-right">Do Not Call</TableHead>
                        <TableHead className="text-right">Outcomes</TableHead>
                        <TableHead className="text-right">Total Usage</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            Loading campaigns...
                          </TableCell>
                        </TableRow>
                      ) : campaigns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            No campaigns found. Create your first campaign to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            {getStatusBadge(campaign.execution_status)}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Button
                              variant="link"
                              className="p-0 h-auto font-medium text-left"
                              onClick={() => openCampaignDetails(campaign.id, campaign.name)}
                            >
                              {campaign.name}
                            </Button>
                          </TableCell>
                          <TableCell>
                            {campaign.daily_cap}
                          </TableCell>
                          <TableCell>
                            {campaign.assistant_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {campaign.contact_source === 'contact_list' 
                              ? (campaign.contact_list_name || 'Unknown List')
                              : (campaign.csv_file_name || 'Unknown CSV')
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.dials}
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.pickups}
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.do_not_call}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col text-xs space-y-1">
                              <span className="text-success">I: {campaign.interested}</span>
                              <span className="text-destructive">NI: {campaign.not_interested}</span>
                              <span className="text-warning">CB: {campaign.callback}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.total_usage}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCampaignDetails(campaign.id, campaign.name)}
                                className="text-theme-secondary hover:text-theme-primary"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCampaignStatus(campaign.id)}
                                className="text-theme-secondary hover:text-theme-primary"
                              >
                                {campaign.execution_status === 'running' ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        ))
                      )}
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
        
        <CampaignDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          campaignId={selectedCampaignId}
          campaignName={selectedCampaignName}
        />
        
        <DeleteCampaignDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={confirmDeleteCampaign}
          campaignName={selectedCampaignName}
          isRunning={campaigns.find(c => c.id === selectedCampaignId)?.execution_status === 'running'}
          loading={deleting}
        />
      </ThemeContainer>
    </DashboardLayout>
  );
}