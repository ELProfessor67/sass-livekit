import React, { useEffect, useMemo, useState, useRef } from "react";
import { Search, Edit2, Copy, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { CreateAssistantDialog } from "@/components/assistants/CreateAssistantDialog";
import { AssistantDetailsDialog } from "@/components/assistants/AssistantDetailsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouteChangeData } from "@/hooks/useRouteChange";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Assistant {
  id: string;
  name: string;
  description: string;
  prompt?: string;
  first_message?: string;
  first_sms?: string;
  sms_prompt?: string;
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

function AssistantCard({ assistant, onAssistantClick, onDeleteAssistant }: { assistant: Assistant; onAssistantClick: (assistant: Assistant) => void; onDeleteAssistant: (assistantId: string) => void }) {
  const navigate = useNavigate();

  const statusColors = {
    draft: "hsl(45 93% 47%)", // Professional amber
    active: "hsl(142 76% 36%)", // Deep success green  
    inactive: "hsl(215 28% 17%)" // Neutral charcoal
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/assistants/edit/${assistant.id}`);
  };

  const handleStartCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/voiceagent?assistantId=${encodeURIComponent(assistant.id)}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't call onDeleteAssistant here - let the AlertDialog handle it
  };

  const handleCardClick = () => {
    onAssistantClick(assistant);
  };

  return (
    <ThemeCard variant="default" interactive className="group cursor-pointer" onClick={handleCardClick}>
      <div className="p-5">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-lg mb-1 text-theme-primary group-hover:text-primary transition-colors">
              {assistant.name}
            </h3>
            <div className="flex items-center space-x-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusColors[assistant.status] }}
              />
              <span className="text-sm text-theme-secondary">
                {assistant.status.charAt(0).toUpperCase() + assistant.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEdit}
                    className="h-7 w-7 p-0 bg-background/80 hover:bg-background border-border/50"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit assistant configuration</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 bg-background/80 hover:bg-background border-border/50"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Duplicate assistant</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDeleteClick}
                        className="h-7 w-7 p-0 bg-background/80 hover:bg-destructive/20 border-border/50 hover:border-destructive/50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Assistant</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{assistant.name}"? This action cannot be undone and all associated data will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteAssistant(assistant.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete assistant</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Content Section */}
        <div className="mb-4">
          <p className="text-sm line-clamp-2 text-theme-secondary">
            {assistant.description}
          </p>
        </div>

        {/* Footer Section */}
        <div className="border-t pt-3 flex items-center justify-between border-theme-border">
          <div className="flex items-center space-x-2 text-xs text-theme-secondary">
            <span>{assistant.interactionCount.toLocaleString()} interactions</span>
            <span>•</span>
            <span>{assistant.userCount.toLocaleString()} users</span>
          </div>
          <Button size="sm" onClick={handleStartCall}>
            Start Call
          </Button>
        </div>
      </div>
    </ThemeCard>
  );
}

interface AssistantsTabProps {
  tabChangeTrigger?: number;
}
// add: imports

// ...keep the rest

export function AssistantsTab({ tabChangeTrigger = 0 }: AssistantsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadAssistantsForUser = async () => {
    if (!user?.id) {
      setAssistants([]);
      return;
    }

    const { data, error } = await supabase
      .from("assistant")
      .select(
        "id, name, prompt, first_message, first_sms, sms_prompt, cal_api_key, cal_event_type_slug, cal_event_type_id, cal_timezone, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Failed to load assistants:", error);
      setAssistants([]);
      return;
    }

    type AssistantRow = {
      id: string;
      name: string | null;
      prompt: string | null;
      first_message: string | null;
      first_sms: string | null;
      sms_prompt: string | null;
      cal_api_key: string | null;
      cal_event_type_slug: string | null;
      cal_event_type_id: string | null;
      cal_timezone: string | null;
      created_at: string | null;
      updated_at: string | null;
    };

    const mapped: Assistant[] =
      (data as AssistantRow[] | null)?.map((row) => {
        const descriptionSource = row.prompt || row.first_message || "";
        return {
          id: row.id,
          name: row.name || "Untitled Assistant",
          description: descriptionSource.substring(0, 200),
          prompt: row.prompt || undefined,
          first_message: row.first_message || undefined,
          first_sms: row.first_sms || undefined,
          sms_prompt: row.sms_prompt || undefined,
          status: "active",
          interactionCount: 0,
          userCount: 0,
          cal_api_key: row.cal_api_key || undefined,
          cal_event_type_slug: row.cal_event_type_slug || undefined,
          cal_event_type_id: row.cal_event_type_id || undefined,
          cal_timezone: row.cal_timezone || undefined,
          cal_enabled: !!row.cal_api_key,
          created_at: row.created_at || undefined,
          updated_at: row.updated_at || undefined,
        };
      }) || [];

    setAssistants(mapped);
  };

  const deleteAssistant = async (assistantId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("assistant")
        .delete()
        .eq("id", assistantId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to delete assistant:", error);
        toast({
          title: "Error",
          description: "Failed to delete assistant. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Remove the assistant from the local state
      setAssistants(prev => prev.filter(assistant => assistant.id !== assistantId));
      
      // Close the detail modal if the deleted assistant is currently being viewed
      if (selectedAssistant?.id === assistantId) {
        setIsDialogOpen(false);
        setSelectedAssistant(null);
      }
      
      toast({
        title: "Assistant deleted",
        description: "The assistant has been permanently deleted.",
      });
    } catch (error) {
      console.error("Error deleting assistant:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Simple: load assistants when user exists or tab changes
  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      loadAssistantsForUser().finally(() => setLoading(false));
    }
  }, [user]);

  const handleAssistantClick = (assistant: Assistant) => {
    setSelectedAssistant(assistant);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedAssistant(null);
  };

  const filteredAssistants = useMemo(
    () =>
      assistants.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [assistants, searchQuery]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Your Assistants
          </h2>
          <p className="text-muted-foreground">
            Manage and configure your AI assistants for different use cases
          </p>
        </div>
        <CreateAssistantDialog />
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assistants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Assistants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Simple skeletons (or swap with your Skeleton component)
          Array.from({ length: 3 }).map((_, i) => (
            <ThemeCard key={i} variant="default" className="p-5 animate-pulse">
              <div className="h-5 w-2/3 bg-muted rounded mb-3" />
              <div className="h-3 w-1/3 bg-muted rounded mb-4" />
              <div className="h-3 w-full bg-muted rounded mb-2" />
              <div className="h-3 w-5/6 bg-muted rounded mb-6" />
              <div className="h-8 w-full bg-muted rounded" />
            </ThemeCard>
          ))
        ) : filteredAssistants.length > 0 ? (
          filteredAssistants.map((assistant) => (
            <AssistantCard
              key={assistant.id}
              assistant={assistant}
              onAssistantClick={handleAssistantClick}
              onDeleteAssistant={deleteAssistant}
            />
          ))
        ) : (
          <div className="col-span-full">
            <ThemeCard variant="default" className="text-center py-12">
              <CardContent>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No assistants found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "Try adjusting your search criteria"
                    : "Get started by creating your first AI assistant"}
                </p>
                {!searchQuery && <CreateAssistantDialog />}
              </CardContent>
            </ThemeCard>
          </div>
        )}
      </div>

      {/* Assistant Details Dialog */}
      <AssistantDetailsDialog
        assistant={selectedAssistant}
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
      />
    </div>
  );
}
