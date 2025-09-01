
import { Link } from "react-router-dom";
import { TableCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Clock, MoreVertical, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing } from "lucide-react";
import { getOutcomeBadge, normalizeResolution } from "@/components/dashboard/call-outcomes/utils";
import { formatPhoneNumber, formatCallDuration, formatDateTime, getCustomerName } from "@/utils/formatUtils";
import { Call } from "../types";
import { CompactAudioPlayer } from "@/components/ui/compact-audio-player";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CallsTableRowProps {
  call: Call;
}

export function CallsTableRow({ call }: CallsTableRowProps) {
  const { toast } = useToast();
  
  // Check if this is a booked appointment for highlighting
  const isBookedAppointment = normalizeResolution(call.resolution || '') === 'booked appointment';
  
  // Construct a date-time string from the separate date and time fields
  const dateTimeStr = `${call.date}T${call.time || '00:00'}`;
  const formattedDateTime = formatDateTime(dateTimeStr);
  
  return (
    <TableRow 
      key={call.id} 
      className={isBookedAppointment 
        ? "hover:bg-primary/10 bg-primary/5 border-b border-border/20 backdrop-blur-sm transition-colors" 
        : "hover:bg-muted/50 border-b border-border/20 backdrop-blur-sm transition-colors"
      }
    >
      <TableCell className={isBookedAppointment ? "font-medium text-primary" : "font-medium text-foreground"}>
        <Link to={`/calls/${call.id}`} className="hover:underline">
          <div className="flex items-center gap-3">
            {getCallIcon(call)}
            <div>
              <div className="text-sm font-semibold font-feature-settings tracking-tight antialiased">{getCustomerName(call)}</div>
              <div className="text-xs text-muted-foreground font-feature-settings tracking-tight">
                {formatPhoneNumber(call.phoneNumber)}
              </div>
            </div>
          </div>
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground font-feature-settings tracking-tight antialiased">{formattedDateTime.date}</span>
          <span className="text-xs text-muted-foreground font-feature-settings tracking-tight">{formattedDateTime.time}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center text-foreground">
          <Clock size={14} className="mr-2 text-muted-foreground" />
          <span className="text-sm font-feature-settings tracking-tight antialiased">{formatCallDuration(call.duration)}</span>
        </div>
      </TableCell>
      <TableCell>
        {call.call_recording && (
          <CompactAudioPlayer 
            src={call.call_recording} 
            duration={call.duration}
            className="max-w-[160px]"
          />
        )}
      </TableCell>
      <TableCell>{getOutcomeBadge(call.resolution)}</TableCell>
      <TableCell>
        <CallRowActions call={call} />
      </TableCell>
    </TableRow>
  );
}

// Helper function to get call icon based on status
function getCallIcon(call: Call) {
  if (call.status === 'Missed' || call.resolution?.toLowerCase().includes('dropped')) {
    return <PhoneMissed size={16} className="text-red-500" />;
  } else if (call.direction === 'Outbound') {
    return <PhoneOutgoing size={16} className="text-blue-500" />;
  } else if (call.status === 'Call Dropped') {
    return <PhoneOff size={16} className="text-gray-500" />;
  } else {
    return <PhoneIncoming size={16} className="text-green-500" />;
  }
}

// Extract row actions into a separate component
function CallRowActions({ call }: { call: Call }) {
  const { toast } = useToast();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-8 w-8 p-0 flex items-center justify-center rounded-full hover:bg-white/[0.08] text-foreground/70 hover:text-foreground transition-all duration-200">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/calls/${call.id}`}>View details</Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            toast({
              title: "Recording downloaded",
              description: "Call recording has been downloaded successfully",
            });
          }}
        >
          Download recording
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            toast({
              title: "Call marked as resolved",
              description: "The call status has been updated to resolved",
            });
          }}
        >
          Mark as resolved
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
