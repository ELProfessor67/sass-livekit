import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemedDialog, ThemedDialogTrigger } from "@/components/ui/themed-dialog";
import { FileText } from "lucide-react";
import { CallDialogContent } from "../calls/CallDialogContent";

interface RecentCallsTableProps {
  currentCalls: any[];
}

export function RecentCallsTable({ currentCalls }: RecentCallsTableProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      dropped: { color: 'bg-yellow-100 text-yellow-800', label: 'Dropped' },
      spam: { color: 'bg-orange-100 text-orange-800', label: 'Spam' },
      no_response: { color: 'bg-gray-100 text-gray-800', label: 'No Response' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] ||
      { color: 'bg-blue-100 text-blue-800', label: status };

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentCalls.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No calls found
              </TableCell>
            </TableRow>
          ) : (
            currentCalls.map((call, index) => (
              <ThemedDialog key={call.id || index}>
                <TableRow>
                  <TableCell>
                    <ThemedDialogTrigger asChild>
                      <div className="cursor-pointer hover:text-primary transition-colors">
                        <div className="font-medium">
                          {call.participant_identity || call.phoneNumber || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {call.phone_number || call.phoneNumber || 'No number'}
                        </div>
                      </div>
                    </ThemedDialogTrigger>
                  </TableCell>
                  <TableCell>
                    {formatDateTime(call.start_time || call.created_at || call.date)}
                  </TableCell>
                  <TableCell>
                    {formatDuration(call.call_duration || call.duration || 0)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(call.call_status || call.status || 'completed')}
                  </TableCell>
                  <TableCell>
                    <ThemedDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <FileText size={14} strokeWidth={1.5} />
                        Details
                      </Button>
                    </ThemedDialogTrigger>
                  </TableCell>
                </TableRow>
                <CallDialogContent call={call} />
              </ThemedDialog>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}