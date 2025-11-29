
import { Button } from "@/components/ui/button";
import { CreditCard, PlusCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  SectionHeading,
  BodyText
} from "@/components/ui/typography";

interface PaymentMethod {
  id: string | number;
  type: "visa" | "mastercard" | "amex" | "discover" | "jcb" | "diners" | "unionpay" | string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface PaymentMethodsCardProps {
  paymentMethods: PaymentMethod[];
}

export function PaymentMethodsCard({ paymentMethods }: PaymentMethodsCardProps) {
  return (
    <Card className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <h3 className="text-xl font-medium text-foreground">Payment Methods</h3>
          <p className="text-muted-foreground text-sm">Your saved payment methods</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 backdrop-blur-xl bg-white/[0.04] border-white/[0.12] text-foreground hover:bg-white/[0.08]">
          <PlusCircle className="h-4 w-4" />
          Add Card
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No payment methods saved</p>
            </div>
          ) : (
            paymentMethods.map((method) => (
            <div 
              key={method.id}
              className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.01] p-4 transition-all hover:border-white/[0.16] hover:bg-white/[0.02] backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-9 w-14 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm">
                    {method.type === "visa" ? (
                      <div className="text-blue-600 font-bold text-xs">VISA</div>
                    ) : method.type === "mastercard" ? (
                      <div className="text-red-600 font-bold text-xs">MC</div>
                    ) : method.type === "amex" ? (
                      <div className="text-blue-500 font-bold text-xs">AMEX</div>
                    ) : (
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      •••• {method.last4}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires {method.expMonth}/{method.expYear}
                    </p>
                  </div>
                </div>
                {method.isDefault && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    Default
                  </span>
                )}
              </div>
            </div>
          ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
