
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ThemedDialog, ThemedDialogTrigger } from "@/components/ui/themed-dialog";
import { Clock, FileText } from "lucide-react";
import { CallDialogContent } from "../calls/CallDialogContent";
import { formatPhoneNumber, formatDateTime, formatCallDuration, getCustomerName } from "@/utils/formatUtils";
import { getOutcomeBadge } from "../call-outcomes/utils";
import { Call } from "@/components/calls/types";
import { normalizeResolution } from "../call-outcomes/utils";
import { CallIcon } from "./CallIcon";

interface CallTableRowProps {
  call: Call;
}

export function CallTableRow({ call }: CallTableRowProps) {
  // Fix 1: Use date and time properties instead of created_at
  const formattedDateTime = formatDateTime(`${call.date}T${call.time || '00:00'}`);
  
  // Check if this is a booked appointment for highlighting
  const isBookedAppointment = normalizeResolution(call.resolution || '') === 'booked appointment';

  // Apply conditional styling for booked appointments
  const rowStyles = isBookedAppointment ? 
    "border-b border-border/20 bg-primary/5 hover:bg-primary/10" : 
    "border-b border-border/20";
  
  const nameStyles = isBookedAppointment ? 
    "font-medium text-primary" : 
    "font-medium";
  
  return (
    <ThemedDialog>
      <TableRow key={call.id} className={rowStyles}>
        <TableCell className={nameStyles}>
          <ThemedDialogTrigger asChild>
            <div className="cursor-pointer hover:text-primary transition-colors">
              <div className="font-semibold font-feature-settings tracking-tight antialiased">{getCustomerName(call)}</div>
              <div className="text-sm text-muted-foreground font-feature-settings tracking-tight">
                {/* Fix 2: Use phoneNumber instead of phone_number */}
                {formatPhoneNumber(call.phoneNumber)}
              </div>
            </div>
          </ThemedDialogTrigger>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="text-sm font-medium font-feature-settings tracking-tight antialiased">{formattedDateTime.date}</span>
            <span className="text-xs text-muted-foreground font-feature-settings tracking-tight">{formattedDateTime.time}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center">
            <Clock size={14} strokeWidth={1.5} className="mr-1 text-muted-foreground" />
            <span className="font-feature-settings tracking-tight antialiased">{formatCallDuration(call.duration || '0:00')}</span>
          </div>
        </TableCell>
        <TableCell>
          {/* Fix 3: Use resolution instead of call_outcome */}
          {getOutcomeBadge(call.resolution)}
        </TableCell>
        <TableCell>
          <ThemedDialogTrigger asChild>
            <Button variant={isBookedAppointment ? "default" : "outline"} size="sm" className="flex items-center gap-1">
              <FileText size={14} strokeWidth={1.5} />
              Details
            </Button>
          </ThemedDialogTrigger>
        </TableCell>
      </TableRow>
      <CallDialogContent call={call} />
    </ThemedDialog>
  );
}
