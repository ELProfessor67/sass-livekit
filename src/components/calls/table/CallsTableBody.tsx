
import { TableBody } from "@/components/ui/table";
import { Call } from "../types";
import { CallsTableRow } from "./CallsTableRow";

interface CallsTableBodyProps {
  calls: Call[];
}

export function CallsTableBody({ calls }: CallsTableBodyProps) {
  return (
    <TableBody>
      {calls.map((call) => {
        // Make sure we have valid data
        if (!call || !call.id) {
          console.warn("Invalid call data encountered:", call);
          return null;
        }
        
        return <CallsTableRow key={call.id} call={call} />;
      })}
    </TableBody>
  );
}
