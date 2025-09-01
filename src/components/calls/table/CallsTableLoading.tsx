
import { TableBody, TableCell, TableRow, Table } from "@/components/ui/table";
import { CallsTableHeader } from "./CallsTableHeader";

export function CallsTableLoading() {
  return (
    <Table>
      <CallsTableHeader />
      <TableBody>
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center">
            Loading call data...
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
