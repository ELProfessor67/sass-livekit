
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";

export function CallTableEmpty() {
  return (
    <TableRow>
      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
        No recent calls to display
      </TableCell>
    </TableRow>
  );
}
