
import React from "react";
import { Table, TableBody } from "@/components/ui/table";
import { CallTableHeader } from "./CallTableHeader";
import { CallTableRow } from "./CallTableRow";
import { CallTableEmpty } from "./CallTableEmpty";
import { Call } from "@/components/calls/types";

interface RecentCallsTableProps {
  currentCalls: Call[];
}

export function RecentCallsTable({ currentCalls }: RecentCallsTableProps) {
  return (
    <div className="overflow-hidden">
      <Table>
        <CallTableHeader />
        <TableBody>
          {currentCalls.length === 0 ? (
            <CallTableEmpty />
          ) : (
            currentCalls.map((call) => (
              <CallTableRow key={call.id} call={call} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
