
import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Calendar, Clock, Phone } from "lucide-react";

export function CallTableHeader() {
  return (
    <TableHeader>
      <TableRow className="border-b border-border/40">
        <TableHead>
          <div className="flex items-center gap-2 font-medium text-sm font-feature-settings tracking-tight">
            <User size={14} strokeWidth={1.5} className="text-muted-foreground" />
            Customer
          </div>
        </TableHead>
        <TableHead>
          <div className="flex items-center gap-2 font-medium text-sm font-feature-settings tracking-tight">
            <Calendar size={14} strokeWidth={1.5} className="text-muted-foreground" />
            Date
          </div>
        </TableHead>
        <TableHead>
          <div className="flex items-center gap-2 font-medium text-sm font-feature-settings tracking-tight">
            <Clock size={14} strokeWidth={1.5} className="text-muted-foreground" />
            Duration
          </div>
        </TableHead>
        <TableHead>
          <div className="flex items-center gap-2 font-medium text-sm font-feature-settings tracking-tight">
            <Phone size={14} strokeWidth={1.5} className="text-muted-foreground" />
            Call Outcome
          </div>
        </TableHead>
        <TableHead className="font-medium text-sm font-feature-settings tracking-tight">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
