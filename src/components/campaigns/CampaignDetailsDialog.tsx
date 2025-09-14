import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, Square, RefreshCw, Phone, PhoneCall, PhoneOff, Clock, CheckCircle, XCircle } from "lucide-react";
import { getCampaignStatus, CampaignStatus } from "@/lib/api/campaigns/getCampaignStatus";
import { getCampaignCalls, CampaignCall } from "@/lib/api/campaigns/getCampaignCalls";
import { startCampaign } from "@/lib/api/campaigns/startCampaign";
import { pauseCampaign } from "@/lib/api/campaigns/pauseCampaign";
import { resumeCampaign } from "@/lib/api/campaigns/resumeCampaign";
import { stopCampaign } from "@/lib/api/campaigns/stopCampaign";
import { supabase } from "@/integrations/supabase/client";

interface CampaignDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
}

export function CampaignDetailsDialog({ open, onOpenChange, campaignId, campaignName }: CampaignDetailsDialogProps) {
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus | null>(null);
  const [calls, setCalls] = useState<CampaignCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assistantPhoneNumber, setAssistantPhoneNumber] = useState<string>('');

  // Load campaign status and calls
  const loadCampaignData = async () => {
    if (!campaignId) return;

    setLoading(true);
    try {
      const [statusResult, callsResult] = await Promise.all([
        getCampaignStatus(campaignId),
        getCampaignCalls({ campaignId, limit: 50 })
      ]);

      if (statusResult.success && statusResult.campaign) {
        setCampaignStatus(statusResult.campaign);
        
        // Get assistant phone number
        if (statusResult.campaign.campaign?.assistant_id) {
          try {
            const { data: assistantPhone } = await supabase
              .from('phone_number')
              .select('number')
              .eq('inbound_assistant_id', statusResult.campaign.campaign.assistant_id)
              .eq('status', 'active')
              .single();
            
            if (assistantPhone) {
              setAssistantPhoneNumber(assistantPhone.number);
            }
          } catch (error) {
            console.error('Error fetching assistant phone number:', error);
          }
        }
      }

      if (callsResult.success && callsResult.calls) {
        setCalls(callsResult.calls);
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await loadCampaignData();
    setRefreshing(false);
  };

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadCampaignData();
    }
  }, [open, campaignId]);

  // Auto-refresh every 10 seconds when dialog is open
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [open]);

  const handleStartCampaign = async () => {
    const result = await startCampaign({ campaignId });
    if (result.success) {
      await refreshData();
    }
  };

  const handlePauseCampaign = async () => {
    const result = await pauseCampaign({ campaignId });
    if (result.success) {
      await refreshData();
    }
  };

  const handleResumeCampaign = async () => {
    const result = await resumeCampaign({ campaignId });
    if (result.success) {
      await refreshData();
    }
  };

  const handleStopCampaign = async () => {
    const result = await stopCampaign({ campaignId });
    if (result.success) {
      await refreshData();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'calling':
        return <PhoneCall className="w-4 h-4 text-blue-500" />;
      case 'answered':
        return <Phone className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
      case 'no_answer':
      case 'busy':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;

    const variants = {
      interested: { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      not_interested: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
      callback: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
      do_not_call: { variant: 'outline' as const, className: 'bg-gray-100 text-gray-800' },
      voicemail: { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' },
      wrong_number: { variant: 'outline' as const, className: 'bg-orange-100 text-orange-800' }
    };

    const config = variants[outcome as keyof typeof variants] || variants.do_not_call;
    return (
      <Badge variant={config.variant} className={config.className}>
        {outcome.replace('_', ' ')}
      </Badge>
    );
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[var(--text-xl)] font-[var(--font-semibold)] text-theme-primary">
              {campaignName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              {campaignStatus?.campaign && (
                <div className="flex items-center gap-2">
                  {campaignStatus.campaign.execution_status === 'idle' && (
                    <Button size="sm" onClick={handleStartCampaign}>
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                  )}
                  {campaignStatus.campaign.execution_status === 'running' && (
                    <Button size="sm" variant="outline" onClick={handlePauseCampaign}>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  {campaignStatus.campaign.execution_status === 'paused' && (
                    <Button size="sm" onClick={handleResumeCampaign}>
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                  )}
                  {(campaignStatus.campaign.execution_status === 'running' || 
                    campaignStatus.campaign.execution_status === 'paused') && (
                    <Button size="sm" variant="destructive" onClick={handleStopCampaign}>
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading campaign data...</span>
          </div>
        ) : campaignStatus?.campaign ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="calls">Calls</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge 
                      variant={campaignStatus.campaign?.execution_status === 'running' ? 'default' : 'secondary'}
                      className={campaignStatus.campaign?.execution_status === 'running' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {campaignStatus.campaign?.execution_status || 'unknown'}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Daily Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {campaignStatus.campaign?.current_daily_calls || 0} / {campaignStatus.campaign?.daily_cap || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      calls today
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {campaignStatus.campaign?.total_calls_made || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      calls made
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Answer Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(campaignStatus.campaign?.total_calls_made || 0) > 0 
                        ? Math.round(((campaignStatus.campaign?.total_calls_answered || 0) / (campaignStatus.campaign?.total_calls_made || 1)) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      answered
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Campaign Prompt Section */}
              {campaignStatus.campaign?.campaign_prompt && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Campaign Prompt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {campaignStatus.campaign.campaign_prompt}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      This is the script your AI agent will follow during outbound calls.
                      Placeholders like {`{name}`}, {`{email}`}, and {`{phone}`} will be replaced with actual contact information.
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Calling Schedule</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Days:</span>
                      <span className="text-sm font-medium">
                        {campaignStatus.campaign?.calling_days?.join(', ') || 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Hours:</span>
                      <span className="text-sm font-medium">
                        {(campaignStatus.campaign?.start_hour === 0 && campaignStatus.campaign?.end_hour === 0) 
                          ? '24/7' 
                          : `${formatHour(campaignStatus.campaign?.start_hour || 0)} - ${formatHour(campaignStatus.campaign?.end_hour || 0)}`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Calling From:</span>
                      <span className="text-sm font-medium">
                        {assistantPhoneNumber || 'Not configured'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Next Call:</span>
                      <span className="text-sm font-medium">
                        {campaignStatus.campaign?.next_call_at 
                          ? formatDateTime(campaignStatus.campaign.next_call_at)
                          : 'Not scheduled'
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Queued:</span>
                      <span className="text-sm font-medium">{campaignStatus.queueStatus?.queued || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Processing:</span>
                      <span className="text-sm font-medium">{campaignStatus.queueStatus?.processing || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Completed:</span>
                      <span className="text-sm font-medium">{campaignStatus.queueStatus?.completed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Failed:</span>
                      <span className="text-sm font-medium">{campaignStatus.queueStatus?.failed || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="calls" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(call.status)}
                            <span className="text-sm capitalize">{call.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {call.contact_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {call.phone_number}
                        </TableCell>
                        <TableCell>
                          {call.call_duration > 0 ? formatDuration(call.call_duration) : '-'}
                        </TableCell>
                        <TableCell>
                          {getOutcomeBadge(call.outcome)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(call.started_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Call Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="text-sm font-medium">{campaignStatus.stats?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Completed:</span>
                      <span className="text-sm font-medium">{campaignStatus.stats?.completed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Failed:</span>
                      <span className="text-sm font-medium">{campaignStatus.stats?.failed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">No Answer:</span>
                      <span className="text-sm font-medium">{campaignStatus.stats?.noAnswer || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Busy:</span>
                      <span className="text-sm font-medium">{campaignStatus.stats?.busy || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Outcomes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Interested:</span>
                      <span className="text-sm font-medium text-green-600">{campaignStatus.stats?.interested || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Not Interested:</span>
                      <span className="text-sm font-medium text-red-600">{campaignStatus.stats?.notInterested || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Callback:</span>
                      <span className="text-sm font-medium text-yellow-600">{campaignStatus.stats?.callback || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Do Not Call:</span>
                      <span className="text-sm font-medium text-gray-600">{campaignStatus.stats?.doNotCall || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Answer Rate:</span>
                      <span className="text-sm font-medium">
                        {(campaignStatus.stats?.total || 0) > 0 
                          ? Math.round(((campaignStatus.stats?.answered || 0) / (campaignStatus.stats?.total || 1)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Success Rate:</span>
                      <span className="text-sm font-medium">
                        {(campaignStatus.stats?.total || 0) > 0 
                          ? Math.round(((campaignStatus.stats?.completed || 0) / (campaignStatus.stats?.total || 1)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Interest Rate:</span>
                      <span className="text-sm font-medium">
                        {(campaignStatus.stats?.answered || 0) > 0 
                          ? Math.round(((campaignStatus.stats?.interested || 0) / (campaignStatus.stats?.answered || 1)) * 100)
                          : 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-8">
            <span>Failed to load campaign data</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
