import { useState, useEffect } from 'react';
import { PaymentMethodsCard } from "./billing/PaymentMethodsCard";
import { InvoiceHistoryCard } from "./billing/InvoiceHistoryCard";
import { MainHeading, BodyText } from "@/components/ui/typography";
import { useAuth } from '@/contexts/SupportAccessAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "pending";
}

export function BillingSettings() {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBillingData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch payment methods
        const { data: paymentMethodsData, error: paymentMethodsError } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!paymentMethodsError && paymentMethodsData) {
          setPaymentMethods(paymentMethodsData.map((pm: any) => ({
            id: pm.id,
            type: pm.card_brand?.toLowerCase() || 'card',
            last4: pm.card_last4 || '',
            expMonth: pm.card_exp_month || 0,
            expYear: pm.card_exp_year || 0,
            isDefault: pm.is_default || false
          })));
        } else {
          setPaymentMethods([]);
        }

        // Fetch invoices and minutes purchases
        const allInvoices: Invoice[] = [];

        // Fetch from invoices table
        try {
          const { data: invoicesData, error: invoicesError } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

          if (!invoicesError && invoicesData) {
            invoicesData.forEach((inv: any) => {
              const invoiceDate = new Date(inv.created_at || inv.date);
              allInvoices.push({
                id: inv.id || inv.invoice_number || `INV-${inv.id?.slice(0, 8)}`,
                date: invoiceDate.toISOString().split('T')[0],
                amount: `$${Number(inv.amount || 0).toFixed(2)}`,
                status: (inv.status || 'paid') as "paid" | "pending"
              });
            });
          }
        } catch (error) {
          console.log('Invoices table not available:', error);
        }

        // Fetch from minutes_purchases table
        try {
          const { data: purchasesData, error: purchasesError } = await supabase
            .from('minutes_purchases')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

          if (!purchasesError && purchasesData) {
            purchasesData.forEach((purchase: any) => {
              const purchaseDate = new Date(purchase.created_at);
              // Map status: completed -> paid, pending -> pending, others -> pending
              const invoiceStatus = purchase.status === 'completed' ? 'paid' : 
                                   purchase.status === 'pending' ? 'pending' : 'pending';
              
              allInvoices.push({
                id: `MIN-${purchase.id.slice(0, 8)}`,
                date: purchaseDate.toISOString().split('T')[0],
                amount: `$${Number(purchase.amount_paid || 0).toFixed(2)}`,
                status: invoiceStatus as "paid" | "pending"
              });
            });
          }
        } catch (error) {
          console.log('Minutes purchases table not available:', error);
        }

        // Sort all invoices by date (newest first) and set
        allInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setInvoices(allInvoices);

      } catch (error) {
        console.error('Error fetching billing data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-extralight tracking-tight text-foreground">Billing & Payment Methods</h2>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Manage your payment information and view transaction history
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

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
