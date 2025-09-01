import React, { useEffect, useState } from "react";
import { Search, Edit2, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { CreateAssistantDialog } from "@/components/assistants/CreateAssistantDialog";
import { supabase } from "@/integrations/supabase/client";

interface Assistant {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "inactive";
  interactionCount: number;
  userCount: number;
}

function AssistantCard({ assistant }: { assistant: Assistant }) {
  const navigate = useNavigate();
  
  const statusColors = {
    draft: "hsl(45 93% 47%)", // Professional amber
    active: "hsl(142 76% 36%)", // Deep success green  
    inactive: "hsl(215 28% 17%)" // Neutral charcoal
  };

  const handleEdit = () => {
    navigate(`/assistants/edit/${assistant.id}`);
  };

  const handleStartCall = () => {
    navigate(`/voiceagent?assistantId=${encodeURIComponent(assistant.id)}`);
  };

  return (
    <ThemeCard variant="default" interactive className="group">
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
            <Button
              size="sm"
              variant="outline"
              onClick={handleEdit}
              className="h-7 w-7 p-0 bg-background/80 hover:bg-background border-border/50"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 bg-background/80 hover:bg-background border-border/50"
            >
              <Copy className="h-3 w-3" />
            </Button>
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

export function AssistantsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [assistants, setAssistants] = useState<Assistant[]>([]);

  useEffect(() => {
    const loadAssistantsForUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;
      if (!currentUser) {
        setAssistants([]);
        return;
      }

      const { data, error } = await supabase
        .from("assistant")
        .select("id, name, prompt, first_message")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        // eslint-disable-next-line no-console
        console.warn("Failed to load assistants:", error);
        setAssistants([]);
        return;
      }

      type AssistantRow = {
        id: string;
        name: string | null;
        prompt: string | null;
        first_message: string | null;
      };

      const mapped: Assistant[] = (data as AssistantRow[] | null)?.map((row) => {
        const descriptionSource = row.prompt || row.first_message || "";
        return {
          id: row.id,
          name: row.name || "Untitled Assistant",
          description: descriptionSource.substring(0, 200),
          status: "active",
          interactionCount: 0,
          userCount: 0,
        } as Assistant;
      }) || [];

      setAssistants(mapped);
    };

    void loadAssistantsForUser();
  }, []);

  const filteredAssistants = assistants.filter(assistant =>
    assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assistant.description.toLowerCase().includes(searchQuery.toLowerCase())
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
        {filteredAssistants.length > 0 ? (
          filteredAssistants.map((assistant) => (
            <AssistantCard key={assistant.id} assistant={assistant} />
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
                    : "Get started by creating your first AI assistant"
                  }
                </p>
                {!searchQuery && (
                  <CreateAssistantDialog />
                )}
              </CardContent>
            </ThemeCard>
          </div>
        )}
      </div>
    </div>
  );
}