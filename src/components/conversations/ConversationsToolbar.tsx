import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import TimeRangeSelector from "@/components/dashboard/TimeRangeSelector";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConversationsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  resolutionFilter: string;
  onResolutionChange: (value: string) => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  selectedAssistantId?: string;
  onAssistantChange?: (id: string) => void;
}

export default function ConversationsToolbar({
  searchQuery,
  onSearchChange,
  resolutionFilter,
  onResolutionChange,
  dateRange,
  onDateRangeChange,
  selectedAssistantId = "all",
  onAssistantChange,
}: ConversationsToolbarProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  // Fetch assistants for the current workspace (copying logic from Dash FilterBar for consistency)
  const {
    data: assistants = []
  } = useQuery({
    queryKey: ['workspace-assistants', currentWorkspace?.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('assistant')
        .select('id, name')
        .eq('user_id', user.id);

      if (currentWorkspace?.id === null) {
        query = query.is('workspace_id', null);
      } else {
        query = query.eq('workspace_id', currentWorkspace?.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching assistants for filter:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id
  });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-[var(--space-2xl)]">
      <div className="relative">
        <Search className="absolute left-4 top-4 h-4 w-4 text-muted-foreground/70 z-10" />
        <Input
          placeholder="Search conversations, contacts, or outcomes..."
          className="pl-12"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div>
        <TimeRangeSelector onRangeChange={onDateRangeChange} />
      </div>

      <div>
        <Select value={selectedAssistantId} onValueChange={onAssistantChange}>
          <SelectTrigger className="bg-background/50 border-border/50 text-foreground h-11">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-muted-foreground/70" />
              <SelectValue placeholder="All Agents" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-background/95 border-border/50 backdrop-blur-sm">
            <SelectItem value="all" className="text-foreground hover:bg-accent/50">All Agents</SelectItem>
            {assistants.map((assistant) => (
              <SelectItem key={assistant.id} value={assistant.id} className="text-foreground hover:bg-accent/50">
                {assistant.name || "Unnamed Agent"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Select value={resolutionFilter} onValueChange={onResolutionChange}>
          <SelectTrigger className="bg-background/50 border-border/50 text-foreground h-11">
            <SelectValue placeholder="Conversation Outcome: All" />
          </SelectTrigger>
          <SelectContent className="bg-background/95 border-border/50 backdrop-blur-sm">
            <SelectItem value="all" className="text-foreground hover:bg-accent/50">All Outcomes</SelectItem>
            <SelectItem value="booked appointment" className="text-foreground hover:bg-accent/50">Booked Appointment</SelectItem>
            <SelectItem value="qualified" className="text-foreground hover:bg-accent/50">Qualified</SelectItem>
            <SelectItem value="not qualified" className="text-foreground hover:bg-accent/50">Not Qualified</SelectItem>
            <SelectItem value="spam" className="text-foreground hover:bg-accent/50">Spam</SelectItem>
            <SelectItem value="escalated" className="text-foreground hover:bg-accent/50">Escalated</SelectItem>
            <SelectItem value="call dropped" className="text-foreground hover:bg-accent/50">Call Dropped</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}