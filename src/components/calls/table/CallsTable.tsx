
import { Call } from "../types";
import { CallsTableEmpty } from "./CallsTableEmpty";
import { CallsTableLoading } from "./CallsTableLoading";
import { CallsTableHeader } from "./CallsTableHeader";
import { CallsTableBody } from "./CallsTableBody";
import { Table } from "@/components/ui/table";

interface CallsTableProps {
  calls: Call[];
  isLoading: boolean;
  filteredCount?: number;
  totalCount?: number;
}

export default function CallsTable({ calls, isLoading, filteredCount, totalCount }: CallsTableProps) {
  console.log(`CallsTable received ${calls?.length || 0} calls, isLoading=${isLoading}, filtered=${filteredCount}, total=${totalCount}`);

  if (isLoading) {
    return <CallsTableLoading />;
  }

  if (!calls || calls.length === 0) {
    return <CallsTableEmpty filteredCount={filteredCount} totalCount={totalCount} />;
  }

  return (
    <Table>
      <CallsTableHeader />
      <CallsTableBody calls={calls} />
    </Table>
  );
}
