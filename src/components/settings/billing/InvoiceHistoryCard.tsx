import { useState } from "react";
import { DownloadSimple, FileText, CaretLeft, CaretRight } from "phosphor-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

interface Invoice {
  id: string;
  originalId?: string;
  date: string;
  amount: string;
  status: "paid" | "pending";
}

interface InvoiceHistoryCardProps {
  invoices: Invoice[];
}

export function InvoiceHistoryCard({ invoices }: InvoiceHistoryCardProps) {
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const sortedInvoices = [...invoices].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const totalPages = Math.ceil(sortedInvoices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvoices = sortedInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleDownload = (invoice: Invoice) => {
    const formattedDate = new Date(invoice.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${invoice.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 60px; max-width: 600px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 999px; font-size: 11px; font-weight: 700; padding: 3px 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    h1 { font-size: 28px; font-weight: 300; margin-bottom: 8px; }
    .invoice-id { color: #6b7280; font-size: 14px; margin-bottom: 32px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 28px 0; }
    .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 12px; }
    .label { color: #6b7280; }
    .value { font-weight: 500; }
    .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; margin-top: 8px; }
    .footer { margin-top: 48px; font-size: 12px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 40px; } }
  </style>
</head>
<body>
  <div class="header">
   
    <span class="badge">${invoice.status}</span>
  </div>
  <h1>Receipt</h1>
  <p class="invoice-id">Invoice #${invoice.id}</p>
  <hr class="divider" />
  <div class="row"><span class="label">Date</span><span class="value">${formattedDate}</span></div>
  <div class="row"><span class="label">Invoice ID</span><span class="value">${invoice.id}</span></div>
  <div class="row"><span class="label">Status</span><span class="value">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></div>
  <hr class="divider" />
  <div class="total-row"><span>Total</span><span>${invoice.amount}</span></div>
  <div class="footer">
    <p>Thank you for your business.</p>
    <p style="margin-top:6px">This is an official receipt generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
  </div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;

    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('afterprint', () => URL.revokeObjectURL(url));
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <Card className="backdrop-blur-xl bg-white/[0.02] border-white/[0.08] shadow-2xl rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-xl font-medium text-foreground">Invoice History</CardTitle>
          <CardDescription className="text-sm font-light">View and download your past invoices</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl px-4 backdrop-blur-sm bg-white/[0.05] border-white/[0.1] hover:bg-white/[0.1] transition-all">
          <DownloadSimple size={16} weight="bold" className="mr-2" />
          Export All
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.01]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/[0.08] bg-white/[0.02]">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground py-4">Invoice</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground py-4">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground py-4">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground py-4">Amount</TableHead>
                <TableHead className="text-right py-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <div className="p-3 bg-white/[0.03] rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <FileText size={24} className="text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-light">No invoices found</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="group hover:bg-white/[0.02] border-white/[0.05] transition-colors">
                    <TableCell className="font-medium text-sm py-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} weight="duotone" className="text-primary/70" />
                        {invoice.id}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-4">
                      {new Date(invoice.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${invoice.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}>
                        <div className={`w-1 h-1 rounded-full mr-1.5 ${invoice.status === "paid" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {invoice.status === "paid" ? "PAID" : "PENDING"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium py-4">{invoice.amount}</TableCell>
                    <TableCell className="text-right py-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg transition-all hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleDownload(invoice)}
                      >
                        <DownloadSimple size={14} weight="bold" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2">
            <p className="text-xs text-muted-foreground font-light">
              Showing <span className="text-foreground font-medium">{startIndex + 1}</span> to <span className="text-foreground font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, sortedInvoices.length)}</span> of <span className="text-foreground font-medium">{sortedInvoices.length}</span> results
            </p>
            <Pagination>
              <PaginationContent className="gap-2">
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-lg border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-30"
                  >
                    <CaretLeft size={16} weight="bold" />
                  </Button>
                </PaginationItem>
                <div className="flex items-center gap-1 mx-2">
                  <span className="text-xs font-medium">{currentPage}</span>
                  <span className="text-xs text-muted-foreground">/</span>
                  <span className="text-xs text-muted-foreground">{totalPages}</span>
                </div>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-lg border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-30"
                  >
                    <CaretRight size={16} weight="bold" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
