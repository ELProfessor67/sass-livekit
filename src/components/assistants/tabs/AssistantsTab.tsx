import React, { useEffect, useMemo, useState, useRef } from "react";
import { Search, Edit2, Copy, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { CreateAssistantDialog } from "@/components/assistants/CreateAssistantDialog";
import { AssistantDetailsDialog } from "@/components/assistants/AssistantDetailsDialog";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ThemedDialog,
  ThemedDialogTrigger,
  ThemedDialogContent,
  ThemedDialogHeader,
} from "@/components/ui/themed-dialog";

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

function AssistantCard({
  assistant,
  onDelete,
  onCardClick
}: {
  assistant: Assistant;
  onDelete: (id: string) => void;
  onCardClick: (assistant: Assistant) => void;
}) {
  const navigate = useNavigate();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const suppressClickRef = React.useRef(false);

  const statusColors = {
    draft: "hsl(45 93% 47%)", // Professional amber
    active: "hsl(142 76% 36%)", // Deep success green  
    inactive: "hsl(215 28% 17%)" // Neutral charcoal
  };
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/assistants/edit/${assistant.id}`);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Copy functionality will be implemented later
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCardClick(assistant);
  };

  return (
    <ThemeCard
      variant="elevated"
      interactive
      className="group aspect-square relative"
    >
      <div className="p-5 h-full flex flex-col relative">
        {/* Action Buttons - Absolute positioned to avoid layout interference */}
        <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <Button
            size="sm"
            variant="ghost"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleEdit}
            className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleCopy}
            className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>

        {/* Header Section - Clean layout without action buttons */}
        <div className="mb-3 pr-12">
          <h3
            className="font-medium text-base mb-1 text-theme-primary group-hover:text-primary transition-colors line-clamp-2 cursor-pointer hover:underline"
            onClick={handleTitleClick}
          >
            {assistant.name}
          </h3>
          <div className="flex items-center space-x-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusColors[assistant.status] }}
            />
            <span className="text-sm text-theme-secondary">
              {assistant.status.charAt(0).toUpperCase() + assistant.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Content Section - Flexible height */}
        <div className="flex-1 mb-4">
          <p className="text-sm text-theme-secondary leading-relaxed">
            {assistant.description.length > 120
              ? `${assistant.description.substring(0, 120)}...`
              : assistant.description
            }
          </p>
        </div>

        {/* Delete Button - Consistently positioned at bottom right */}
        <div className="absolute bottom-3 right-3">
          <ThemedDialog open={isDeleteOpen} onOpenChange={(open) => {
            setIsDeleteOpen(open);
            if (!open) {
              suppressClickRef.current = true;
              setTimeout(() => {
                suppressClickRef.current = false;
              }, 250);
            }
          }}>
            <ThemedDialogTrigger>
              <Button
                size="sm"
                variant="ghost"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3 text-destructive/60 hover:text-destructive" />
              </Button>
            </ThemedDialogTrigger>
            <ThemedDialogContent>
              <ThemedDialogHeader
                title="Delete Assistant"
                description={`Are you sure you want to delete "${assistant.name}"? This action cannot be undone and will permanently remove the assistant and all its data.`}
              />
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(assistant.id);
                    setIsDeleteOpen(false);
                  }}
                >
                  Delete Assistant
                </Button>
              </div>
            </ThemedDialogContent>
          </ThemedDialog>
        </div>
      </div>
    </ThemeCard>
  );
}

interface AssistantsTabProps {
  tabChangeTrigger?: number;
}

export function AssistantsTab({ tabChangeTrigger = 0 }: AssistantsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadAssistantsForUser = async () => {
    if (!user?.id) {
      setAssistants([]);
      return;
    }

    console.log("Loading assistants for user:", user.id);

    const { data, error } = await supabase
      .from("assistant")
      .select(
        "id, name, prompt, first_message, first_sms, sms_prompt, cal_api_key, cal_event_type_slug, cal_event_type_id, cal_timezone, inbound_workflow_id, created_at, updated_at, user_id"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    console.log("Load assistants - data:", data);
    console.log("Load assistants - error:", error);
    console.log("Number of assistants loaded:", data?.length || 0);

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
      inbound_workflow_id: string | null;
      created_at: string | null;
      updated_at: string | null;
    };

    const mapped: Assistant[] =
      (data as any)?.map((row: any) => {
        const descriptionSource = row.prompt || row.first_message || "";
        return {
          id: row.id,
          name: row.name || "Untitled Assistant",
          description: descriptionSource.substring(0, 200),
          prompt: row.prompt || undefined,
          first_message: row.first_message || undefined,
          first_sms: row.first_sms || undefined,
          sms_prompt: row.sms_prompt || undefined,
          inbound_workflow_id: row.inbound_workflow_id || undefined,
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
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to delete assistants.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Make sure we only delete assistants that belong to the current user
      const { error } = await supabase
        .from("assistant")
        .delete()
        .eq("id", assistantId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to delete assistant:", error);
        toast({
          title: "Error",
          description: `Failed to delete assistant: ${error.message}`,
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

  // Load assistants when user exists or tab changes
  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      loadAssistantsForUser().finally(() => setLoading(false));
    }
  }, [user, tabChangeTrigger]);

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
          <h2 className="text-2xl font-light text-foreground mb-2">
            Your Assistants
          </h2>
          <p className="text-muted-foreground">
            Manage and configure your AI assistants for different use cases
          </p>
        </div>
        <Button
          variant="default"
          className="font-medium"
          onClick={(e) => {
            console.log("Add Assistant button clicked", e);
            setCreateDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Assistant
        </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <ThemeCard key={i} variant="elevated" className="p-5 animate-pulse aspect-square">
              <div className="h-5 w-2/3 bg-muted rounded mb-3" />
              <div className="h-3 w-1/3 bg-muted rounded mb-4" />
              <div className="h-3 w-full bg-muted rounded mb-2" />
              <div className="h-3 w-5/6 bg-muted rounded mb-6" />
            </ThemeCard>
          ))
        ) : filteredAssistants.length > 0 ? (
          filteredAssistants.map((assistant) => (
            <AssistantCard
              key={assistant.id}
              assistant={assistant}
              onDelete={deleteAssistant}
              onCardClick={handleAssistantClick}
            />
          ))
        ) : (
          <div className="col-span-full">
            <ThemeCard variant="premium-enhanced" className="text-center py-12">
              <CardContent>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No assistants found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "Try adjusting your search criteria"
                    : "Get started by creating your first AI assistant"
                  }
                </p>
                {!searchQuery && (
                  <Button
                    variant="default"
                    className="font-medium"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Assistant
                  </Button>
                )}
              </CardContent>
            </ThemeCard>
          </div>
        )}
      </div>

      {/* Create Assistant Dialog */}
      {createDialogOpen && (
        <CreateAssistantDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreateAssistant={(name: string, description: string) => {
            // Reload assistants after creation
            loadAssistantsForUser();
          }}
        />
      )}

      {/* Assistant Details Dialog */}
      <AssistantDetailsDialog
        assistant={selectedAssistant}
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
      />
    </div>
  );
}
