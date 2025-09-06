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
        <TimeRangeSelector onRangeChange={onDateRangeChange} initialRange={dateRange} />
      </div>
      
      <div>
        <Select value={resolutionFilter} onValueChange={onResolutionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Conversation Outcome: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="booked appointment">Booked Appointment</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="not qualified">Not Qualified</SelectItem>
            <SelectItem value="spam">Spam</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
            <SelectItem value="call dropped">Call Dropped</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}