
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function CallsTableHeader() {
  return (
    <TableHeader className="backdrop-blur-sm bg-white/[0.01] border-b border-white/[0.06]">
      <TableRow className="border-b border-white/[0.06] hover:bg-white/[0.02]">
        <TableHead className="w-[240px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Customer</TableHead>
        <TableHead className="w-[120px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Date</TableHead>
        <TableHead className="w-[100px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Duration</TableHead>
        <TableHead className="w-[180px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Recording</TableHead>
        <TableHead className="text-foreground font-medium text-sm font-feature-settings tracking-tight">Call Outcome</TableHead>
        <TableHead className="w-[60px]"></TableHead>
      </TableRow>
    </TableHeader>
  );
}
