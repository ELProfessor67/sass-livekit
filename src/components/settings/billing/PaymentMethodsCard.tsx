
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, DotsThreeVertical } from "phosphor-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";

interface PaymentMethod {
  id: string | number;
  type: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface PaymentMethodsCardProps {
  paymentMethods: PaymentMethod[];
  canEdit?: boolean;
}

export function PaymentMethodsCard({ paymentMethods, canEdit }: PaymentMethodsCardProps) {
  return (
    <Card className="backdrop-blur-xl bg-white/[0.02] border-white/[0.08] shadow-2xl rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-xl font-medium text-foreground">Payment Methods</CardTitle>
          <CardDescription className="text-sm">Manage your saved payment methods</CardDescription>
        </div>
        {canEdit && (
          <Button size="sm" className="rounded-xl px-4 shadow-lg shadow-primary/10">
            <Plus size={16} weight="bold" className="mr-2" />
            Add Card
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentMethods.length === 0 ? (
            <div className="col-span-full text-center py-12 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01]">
              <div className="p-3 bg-white/[0.03] rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <CreditCard size={24} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground font-light">No payment methods saved</p>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div
                key={method.id}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/[0.16] hover:bg-white/[0.04] backdrop-blur-sm shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-16 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.05] backdrop-blur-md shadow-inner">
                      {method.type === "visa" ? (
                        <span className="text-blue-400 font-bold text-[10px] tracking-tighter">VISA</span>
                      ) : method.type === "mastercard" ? (
                        <span className="text-orange-400 font-bold text-[10px] tracking-tighter">MASTERCARD</span>
                      ) : (
                        <CreditCard size={20} weight="duotone" className="text-primary/70" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        •••• {method.last4}
                        {method.isDefault && (
                          <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                            DEFAULT
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-light mt-0.5">
                        Expires {String(method.expMonth).padStart(2, '0')}/{method.expYear}
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <DotsThreeVertical size={18} weight="bold" />
                    </Button>
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
