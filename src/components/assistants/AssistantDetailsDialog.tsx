import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Phone, Users, TrendingUp, Settings, Play, GitBranch, Save } from "lucide-react";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
} from "@/components/ui/themed-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkflows } from "@/hooks/useWorkflows";
import { useToast } from "@/hooks/use-toast";

interface Assistant {
  id: string;
  name: string;
  description: string;
  prompt?: string;
  first_message?: string;
  first_sms?: string;
  sms_prompt?: string;
  inbound_workflow_id?: string;
  status: "draft" | "active" | "inactive";
  interactionCount: number;
  userCount: number;
  cal_api_key?: string;
  cal_event_type_slug?: string;
  cal_event_type_id?: string;
  cal_timezone?: string;
  cal_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Utility functions
const formatPhoneNumber = (number: string) => {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return number;
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString()
  };
};

interface PhoneNumber {
  id: string;
  phone_sid: string;
  number: string;
  label?: string;
  status: string;
  webhook_status: string;
  created_at: string;
}

interface AssistantDetailsDialogProps {
  assistant: Assistant | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AssistantDetailsDialog({ assistant, isOpen, onClose }: AssistantDetailsDialogProps) {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUpdatingWorkflow, setIsUpdatingWorkflow] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { workflows } = useWorkflows();

  const activeWorkflows = workflows?.filter(w => w.status === 'active') || [];

  const handleStartCall = () => {
    navigate(`/voiceagent?assistantId=${assistant.id}`);
    onClose(); // Close the dialog
  };

  useEffect(() => {
    if (assistant && isOpen) {
      loadPhoneNumbers();
      setSelectedWorkflowId(assistant.inbound_workflow_id || "none");
    }
  }, [assistant, isOpen]);

  const loadPhoneNumbers = async () => {
    if (!assistant?.id || !user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("phone_number")
        .select("*")
        .eq("inbound_assistant_id", assistant.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading phone numbers:", error);
        return;
      }

      setPhoneNumbers(data || []);
    } catch (error) {
      console.error("Error loading phone numbers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowChange = async (workflowId: string) => {
    if (!assistant?.id) return;

    setSelectedWorkflowId(workflowId);
    setIsUpdatingWorkflow(true);

    try {
      const { error } = await supabase
        .from("assistant")
        .update({
          inbound_workflow_id: workflowId === "none" ? null : workflowId
        })
        .eq("id", assistant.id);

      if (error) throw error;

      toast({
        title: "Workflow Updated",
        description: "The inbound workflow has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating workflow:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update the workflow. Please try again.",
        variant: "destructive",
      });
      // Revert local state on error
      setSelectedWorkflowId(assistant.inbound_workflow_id || "none");
    } finally {
      setIsUpdatingWorkflow(false);
    }
  };

  if (!assistant) return null;

  const statusColors = {
    draft: "hsl(45 93% 47%)",
    active: "hsl(142 76% 36%)",
    inactive: "hsl(215 28% 17%)"
  };

  const phoneStatusColors = {
    active: "hsl(142 76% 36%)",
    inactive: "hsl(215 28% 17%)",
    pending: "hsl(45 93% 47%)"
  };

  return (
    <ThemedDialog open={isOpen} onOpenChange={onClose}>
      <ThemedDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <ThemedDialogHeader
          title={assistant.name}
          description={assistant.description}
        />

        {/* Start Call Button */}
        <div className="flex justify-end pb-4 border-b border-border">
          <Button
            onClick={handleStartCall}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Start Call
          </Button>
        </div>

        <div className="space-y-6">
          {/* Status Header */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusColors[assistant.status] }}
              />
              <span className="text-sm text-muted-foreground capitalize">
                {assistant.status}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">
              Created {assistant.created_at ? formatDateTime(assistant.created_at).date : "Unknown"}
            </span>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Users</span>
              </div>
              <div className="text-2xl font-light text-foreground">
                {assistant.userCount.toLocaleString()}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Interactions</span>
              </div>
              <div className="text-2xl font-light text-foreground">
                {assistant.interactionCount.toLocaleString()}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Calls</span>
              </div>
              <div className="text-2xl font-light text-foreground">
                {phoneNumbers.length.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Connected Phone Numbers */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Phone className="h-5 w-5" style={{ color: 'white !important' }} />
              <div
                className="text-lg font-medium"
                style={{
                  color: '#ffffff !important',
                  fontSize: '18px',
                  fontWeight: '500'
                }}
              >
                Connected Phone Numbers
              </div>
              <Badge variant="secondary" className="ml-auto">
                {phoneNumbers.length} connected
              </Badge>
            </div>

            {loading ? (
              <div className="text-center py-6 bg-muted/20 rounded-lg border border-dashed">
                <div className="text-sm text-muted-foreground">Loading phone numbers...</div>
              </div>
            ) : phoneNumbers.length > 0 ? (
              <div className="space-y-3">
                {phoneNumbers.map((phoneNumber) => (
                  <div
                    key={phoneNumber.id}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {formatPhoneNumber(phoneNumber.number)}
                        </span>
                        {phoneNumber.label && (
                          <span className="text-sm text-muted-foreground">
                            {phoneNumber.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={phoneNumber.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {phoneNumber.status}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: phoneStatusColors[phoneNumber.status as keyof typeof phoneStatusColors] || phoneStatusColors.inactive }}
                        />
                        <span className="text-xs text-muted-foreground capitalize">
                          {phoneNumber.webhook_status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-muted/20 rounded-lg border border-dashed">
                <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No phone numbers connected to this assistant
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assign phone numbers in the Phone Numbers tab
                </p>
              </div>
            )}
          </div>

          {/* Workflow Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <GitBranch className="h-5 w-5" style={{ color: 'white !important' }} />
              <div
                className="text-lg font-medium"
                style={{
                  color: '#ffffff !important',
                  fontSize: '18px',
                  fontWeight: '500'
                }}
              >
                Inbound Workflow
              </div>
            </div>

            <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Select
                    value={selectedWorkflowId}
                    onValueChange={handleWorkflowChange}
                    disabled={isUpdatingWorkflow}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a workflow to run for inbound calls" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Workflow</SelectItem>
                      {activeWorkflows.map((workflow) => (
                        <SelectItem key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isUpdatingWorkflow && (
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                This workflow will automatically trigger when this assistant receives an inbound call.
              </p>
            </div>
          </div>

          {/* Configuration Details */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="h-5 w-5" style={{ color: 'white !important' }} />
              <div
                className="text-lg font-medium"
                style={{
                  color: '#ffffff !important',
                  fontSize: '18px',
                  fontWeight: '500'
                }}
              >
                Configuration
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Model</span>
                <div className="text-sm font-medium text-foreground bg-muted/20 px-3 py-2 rounded">
                  Not configured
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Voice</span>
                <div className="text-sm font-medium text-foreground bg-muted/20 px-3 py-2 rounded">
                  Not configured
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Last Modified</span>
                <div className="text-sm font-medium text-foreground bg-muted/20 px-3 py-2 rounded">
                  {assistant.updated_at ? formatDateTime(assistant.updated_at).date : "Not configured"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ThemedDialogContent>
    </ThemedDialog>
  );
}
