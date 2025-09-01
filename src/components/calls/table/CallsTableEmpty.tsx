
import { TableBody, TableCell, TableHeader, TableRow, Table } from "@/components/ui/table";
import { CallsTableHeader } from "./CallsTableHeader";

interface CallsTableEmptyProps {
  filteredCount?: number;
  totalCount?: number;
}

export function CallsTableEmpty({ filteredCount, totalCount }: CallsTableEmptyProps) {
  return (
    <Table>
      <CallsTableHeader />
      <TableBody>
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center">
            {filteredCount === 0 && totalCount && totalCount > 0 
              ? "No calls match your current filters. Try adjusting your search criteria." 
              : "No calls found. Try selecting a different date range."}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
