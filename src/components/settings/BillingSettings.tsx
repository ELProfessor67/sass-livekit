
import { PaymentMethodsCard } from "./billing/PaymentMethodsCard";
import { InvoiceHistoryCard } from "./billing/InvoiceHistoryCard";
import { MainHeading, BodyText } from "@/components/ui/typography";

const paymentMethods = [
  {
    id: 1,
    type: "visa" as const,
    last4: "4242",
    expMonth: 12,
    expYear: 2024,
    isDefault: true,
  },
  {
    id: 2,
    type: "mastercard" as const,
    last4: "8956",
    expMonth: 3,
    expYear: 2025,
    isDefault: false,
  }
];

const invoices = [
  {
    id: "INV-001",
    date: "Apr 23, 2025",
    amount: "$49.00",
    status: "paid" as const
  },
  {
    id: "INV-002",
    date: "Mar 23, 2025",
    amount: "$49.00",
    status: "paid" as const
  },
  {
    id: "INV-003",
    date: "Feb 23, 2025",
    amount: "$49.00",
    status: "paid" as const
  },
  {
    id: "INV-004",
    date: "Jan 23, 2025",
    amount: "$49.00",
    status: "paid" as const
  }
];

export function BillingSettings() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extralight tracking-tight text-foreground">Billing & Payment Methods</h2>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Manage your payment information and view transaction history
        </p>
      </div>
      
      <div className="space-y-6">
        <PaymentMethodsCard paymentMethods={paymentMethods} />
        <InvoiceHistoryCard invoices={invoices} />
      </div>
    </div>
  );
}
