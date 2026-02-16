import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import TimeRangeSelector from "@/components/dashboard/TimeRangeSelector";
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
}

export default function ConversationsToolbar({
  searchQuery,
  onSearchChange,
  resolutionFilter,
  onResolutionChange,
  dateRange,
  onDateRangeChange,
}: ConversationsToolbarProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-[var(--space-2xl)]">
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
        <Select value={resolutionFilter} onValueChange={onResolutionChange}>
          <SelectTrigger className="bg-background/50 border-border/50 text-foreground">
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