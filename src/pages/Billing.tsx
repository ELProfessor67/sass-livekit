import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Download, Calendar, Zap, MessageSquare, Users, Loader2, Clock, Building2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { getPlanConfig, getPlanConfigs } from "@/lib/plan-config";
import { supabase } from "@/integrations/supabase/client";
import { MinutesPurchaseDialog } from "@/components/settings/billing/MinutesPurchaseDialog";
import { ChangePlanDialog } from "@/components/settings/billing/ChangePlanDialog";
import { CancelSubscriptionDialog } from "@/components/settings/billing/CancelSubscriptionDialog";
import { AssignMinutesDialog } from "@/components/settings/billing/AssignMinutesDialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";

interface UsageItem {
  name: string;
  used: number;
  limit: number | 'unlimited';
  icon: React.ComponentType<{ className?: string }>;
}

interface Invoice {
  id: string;
  originalId?: string;
  paymentId?: string;
  date: string;
  amount: string;
  status: string;
  type?: 'credit' | 'debit';
  minutes?: number;
  description?: string;
}

interface WorkspaceMinuteRow {
  id: string;
  name: string;
  minuteLimit: number;
  minutesUsed: number;
  remaining: number;
}

export default function Billing() {
  const { user, refreshProfile } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTrialExpired = searchParams.get("trial_expired") === "true";
  const autoOpenedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [currentPlan, setCurrentPlan] = useState<{
    name: string;
    price: string;
    period: string;
    status: string;
    nextBilling: string | null;
  } | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [planConfigs, setPlanConfigs] = useState<Record<string, any>>({});
  const [minutesBalance, setMinutesBalance] = useState<number | 'unlimited'>(0);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isAssignMinutesOpen, setIsAssignMinutesOpen] = useState(false);
  // Workspace-specific minutes state
  const [workspaceMinuteLimit, setWorkspaceMinuteLimit] = useState(0);
  const [workspaceMinutesUsed, setWorkspaceMinutesUsed] = useState(0);
  // Main account workspace breakdown
  const [workspaceRows, setWorkspaceRows] = useState<WorkspaceMinuteRow[]>([]);
  const [totalUserMinutes, setTotalUserMinutes] = useState(0);

  // The auto-created "Main Account" workspace is a real DB row with an ID but represents the user's root account.
  // Treat it as main account so user-level minutes are shown instead of workspace-level (which are always 0).
  const isMainAccount = !currentWorkspace?.id || currentWorkspace?.workspace_name === 'Main Account';

  // Auto-open the upgrade dialog when redirected due to trial expiry
  useEffect(() => {
    if (isTrialExpired && !loading && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setIsChangePlanOpen(true);
    }
  }, [isTrialExpired, loading]);

  const getUsagePercentage = (used: number, limit: number | 'unlimited') => {
    if (limit === 'unlimited' || limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  useEffect(() => {
    const fetchBillingData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch user data for subscription info FIRST (to get real plan from database)
        const { data: userData } = await supabase
          .from('users')
          .select('is_active, trial_ends_at, plan, minutes_limit, minutes_used, is_unlimited, billing, stripe_customer_id, updated_at, tenant, slug_name')
          .eq('id', user.id)
          .single();

        // Determine which tenant's plans to fetch
        // For whitelabel customers, use their tenant (which points to their admin's tenant)
        // For whitelabel admins, they might have plans from main tenant (assigned by super admin)
        //   OR from their own tenant (if they created custom plans)
        // For main tenant users, use null (main tenant)
        let planTenant: string | null = null;
        let isWhitelabelAdmin = false;

        if (userData?.tenant && userData.tenant !== 'main') {
          // User belongs to a whitelabel tenant
          if (userData?.slug_name) {
            // User is a whitelabel admin - check their own tenant first, but also check main tenant
            planTenant = userData.slug_name;
            isWhitelabelAdmin = true;
          } else {
            // User is a whitelabel customer - use their tenant (which points to their admin's tenant)
            planTenant = userData.tenant;
          }
        } else if (userData?.slug_name) {
          // User is a whitelabel admin - use their slug as tenant
          planTenant = userData.slug_name;
          isWhitelabelAdmin = true;
        }
        // Otherwise planTenant stays null (main tenant)

        console.log('[Billing] User data:', {
          userId: user.id,
          userPlan: userData?.plan,
          userTenant: userData?.tenant,
          userSlugName: userData?.slug_name,
          planTenant: planTenant
        });

        // Fetch plan configs for the user's tenant (not hostname tenant)
        let configs = await getPlanConfigs(planTenant);
        console.log('[Billing] Fetched plan configs for tenant:', planTenant, 'Available plans:', Object.keys(configs));

        // If no plans found for the tenant and user has a plan, try direct database query
        if (Object.keys(configs).length === 0 && userData?.plan && planTenant) {
          console.log('[Billing] No plans found via getPlanConfigs, trying direct database query for tenant:', planTenant);
          const { data: directPlans, error: directError } = await supabase
            .from('plan_configs')
            .select('*')
            .eq('tenant', planTenant)
            .eq('is_active', true);

          if (!directError && directPlans && directPlans.length > 0) {
            console.log('[Billing] Found plans via direct query:', directPlans.map(p => ({ key: p.plan_key, name: p.name })));
            const directConfigs: Record<string, any> = {};
            directPlans.forEach((plan: any) => {
              directConfigs[plan.plan_key] = {
                key: plan.plan_key,
                name: plan.name,
                price: Number(plan.price),
                features: Array.isArray(plan.features) ? plan.features : [],
                whitelabelEnabled: plan.whitelabel_enabled ?? false,
                is_unlimited: plan.is_unlimited ?? false,
                minutes_limit: plan.minutes_limit ?? 0
              };
            });
            configs = directConfigs;
          } else {
            console.warn('[Billing] Direct query also returned no plans. Error:', directError);
          }
        }

        setPlanConfigs(configs);

        // Use REAL plan from database (not from auth context)
        const userPlan = (userData?.plan?.toLowerCase() || user?.plan?.toLowerCase() || 'free');

        // Try to find the plan config - check exact match first, then try case-insensitive
        let planConfig = configs[userPlan];

        // If not found, try case-insensitive lookup
        if (!planConfig && userData?.plan) {
          const planKey = Object.keys(configs).find(
            key => key.toLowerCase() === userData.plan.toLowerCase()
          );
          if (planKey) {
            planConfig = configs[planKey];
          }
        }

        // If still not found and user has a plan, try fetching from main tenant as fallback
        // This is especially important for whitelabel admins who may have been assigned plans by super admin
        // We need to explicitly query main tenant (tenant IS NULL) to bypass hostname-based tenant detection
        if (!planConfig && userData?.plan && planTenant && planTenant !== 'main') {
          console.log(`[Billing] Plan "${userPlan}" not found in tenant "${planTenant}", trying main tenant as fallback`);

          // Directly query main tenant plans (tenant IS NULL) to bypass hostname tenant detection
          const { data: mainPlans, error: mainError } = await supabase
            .from('plan_configs')
            .select('*')
            .is('tenant', null)
            .eq('is_active', true);

          if (!mainError && mainPlans && mainPlans.length > 0) {
            const mainConfigs: Record<string, any> = {};
            mainPlans.forEach((plan: any) => {
              mainConfigs[plan.plan_key] = {
                key: plan.plan_key,
                name: plan.name,
                price: Number(plan.price),
                features: Array.isArray(plan.features) ? plan.features : [],
                whitelabelEnabled: plan.whitelabel_enabled ?? false,
                is_unlimited: plan.is_unlimited ?? false,
                minutes_limit: plan.minutes_limit ?? 0
              };
            });

            console.log('[Billing] Main tenant plans available:', Object.keys(mainConfigs));
            const mainPlanKey = Object.keys(mainConfigs).find(
              key => key.toLowerCase() === userData.plan.toLowerCase()
            );
            if (mainPlanKey) {
              planConfig = mainConfigs[mainPlanKey];
              console.log(`[Billing] Found plan "${mainPlanKey}" in main tenant`);
            } else {
              console.warn(`[Billing] Plan "${userPlan}" also not found in main tenant. Available main plans:`, Object.keys(mainConfigs));
            }
          } else {
            console.warn('[Billing] Could not fetch main tenant plans. Error:', mainError);
          }
        }

        // Final fallback - use the plan name from database if available, otherwise free
        if (!planConfig) {
          console.warn(`[Billing] Plan "${userPlan}" not found in any tenant configs, using fallback. Available plans:`, Object.keys(configs));
          // If user has a plan in database but config not found, show it anyway
          if (userData?.plan && userData.plan !== 'free') {
            planConfig = {
              key: userData.plan.toLowerCase(),
              name: userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1), // Capitalize first letter
              price: 0, // Unknown price
              features: []
            };
            console.log(`[Billing] Using fallback plan config for:`, planConfig);
          } else {
            planConfig = configs.free || {
              key: 'free',
              name: 'Free',
              price: 0,
              features: []
            };
          }
        }

        // Determine plan status
        const isActive = userData?.is_active ?? true;
        const status = isActive ? 'active' : 'inactive';

        // Calculate next billing date from real subscription data
        let nextBilling: string | null = null;

        // Check billing JSON field for subscription info (Stripe subscription data)
        if (userData?.billing && typeof userData.billing === 'object') {
          const billing = userData.billing as any;
          // Check for Stripe subscription next billing date
          if (billing.subscription?.current_period_end) {
            nextBilling = new Date(billing.subscription.current_period_end * 1000).toISOString().split('T')[0];
          } else if (billing.next_billing_date) {
            nextBilling = new Date(billing.next_billing_date).toISOString().split('T')[0];
          }
        }

        // Fallback to trial_ends_at if no subscription billing date
        if (!nextBilling && userData?.trial_ends_at) {
          nextBilling = new Date(userData.trial_ends_at).toISOString().split('T')[0];
        }
        // For paid plans without subscription data, don't show dummy date
        // Only show if we have real subscription data

        setCurrentPlan({
          name: planConfig.name,
          price: `$${planConfig.price}`,
          period: "month",
          status,
          nextBilling
        });

        // Set minutes balance (remaining = limit - used) and usage
        let minutesLimit = userData?.minutes_limit || 0;
        const minutesUsed = userData?.minutes_used || 0;
        const userIsUnlimited = !!userData?.is_unlimited;

        // Auto-apply trial minutes if user has 0 minutes and hasn't used any yet
        if (!userIsUnlimited && minutesLimit === 0 && minutesUsed === 0) {
          try {
            const trialTenant = userData?.slug_name ? userData.slug_name : (userData?.tenant && userData.tenant !== 'main' ? userData.tenant : 'main');
            const { data: trialConfig } = await (supabase as any)
              .from('minutes_pricing_config')
              .select('free_trial_enabled, free_trial_minutes, free_trial_days')
              .eq('tenant', trialTenant)
              .maybeSingle();

            if (trialConfig?.free_trial_enabled && trialConfig.free_trial_minutes > 0) {
              const trialEndsAt = new Date();
              trialEndsAt.setDate(trialEndsAt.getDate() + (trialConfig.free_trial_days || 7));
              await supabase
                .from('users')
                .update({
                  minutes_limit: trialConfig.free_trial_minutes,
                  trial_ends_at: trialEndsAt.toISOString(),
                } as any)
                .eq('id', user.id);
              minutesLimit = trialConfig.free_trial_minutes;
            }
          } catch (trialErr) {
            console.warn('[Billing] Could not auto-apply trial minutes:', trialErr);
          }
        }

        const remainingMinutes = userIsUnlimited ? 'unlimited' : Math.max(0, minutesLimit - minutesUsed);

        setIsUnlimited(userIsUnlimited);
        setMinutesBalance(remainingMinutes);
        setMinutesUsed(minutesUsed);
        setTotalUserMinutes(minutesLimit);

        // Fetch workspace-specific minutes data
        // "Main Account" workspace (auto-created) is treated as main account — show user-level breakdown
        const isMainAccountCtx = !currentWorkspace?.id || currentWorkspace?.workspace_name === 'Main Account';
        if (currentWorkspace?.id && !isMainAccountCtx) {
          // A real workspace is selected — fetch its own minutes
          const { data: wsData } = await supabase
            .from('workspace_settings')
            .select('minute_limit, minutes_used')
            .eq('id', currentWorkspace.id)
            .single();
          setWorkspaceMinuteLimit(wsData?.minute_limit || 0);
          setWorkspaceMinutesUsed(wsData?.minutes_used || 0);
        } else {
          // Main Account — build workspace breakdown table (exclude "Main Account" itself)
          const { data: allWs } = await supabase
            .from('workspace_settings')
            .select('id, workspace_name, minute_limit, minutes_used')
            .eq('user_id', user.id)
            .neq('workspace_name', 'Main Account');
          if (allWs) {
            setWorkspaceRows(allWs.map((ws: any) => ({
              id: ws.id,
              name: ws.workspace_name,
              minuteLimit: ws.minute_limit || 0,
              minutesUsed: ws.minutes_used || 0,
              remaining: Math.max(0, (ws.minute_limit || 0) - (ws.minutes_used || 0)),
            })));
          }
        }

        // Fetch assistants for the user
        const { data: assistantsData } = await supabase
          .from('assistant')
          .select('id')
          .eq('user_id', user.id);

        const assistantIds = assistantsData?.map(a => a.id) || [];

        // Fetch usage data
        // 1. API Calls (count of calls from call_history)
        const apiCallsPromise = assistantIds.length > 0
          ? supabase
            .from('call_history')
            .select('*', { count: 'exact', head: true })
            .in('assistant_id', assistantIds)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          : Promise.resolve({ count: 0, error: null });

        // 2. Phone Minutes (sum of call_duration from call_history, convert seconds to minutes)
        const phoneMinutesPromise = assistantIds.length > 0
          ? supabase
            .from('call_history')
            .select('call_duration')
            .in('assistant_id', assistantIds)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          : Promise.resolve({ data: [], error: null });

        // 3. Text Messages (count from sms_messages)
        const textMessagesPromise = supabase
          .from('sms_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        // 4. Team Members - Count from workspace_members table
        const teamMembersPromise = (async () => {
          try {
            // First, find the workspace(s) the user belongs to
            const { data: userWorkspaceMembers } = await supabase
              .from('workspace_members')
              .select('workspace_id')
              .eq('user_id', user.id)
              .eq('status', 'active');

            if (userWorkspaceMembers && userWorkspaceMembers.length > 0) {
              // Get all unique workspace IDs
              const workspaceIds = [...new Set(userWorkspaceMembers.map(m => m.workspace_id))];

              // Count all active members in those workspaces
              const { count: membersCount } = await supabase
                .from('workspace_members')
                .select('*', { count: 'exact', head: true })
                .in('workspace_id', workspaceIds)
                .eq('status', 'active');

              return { count: membersCount || 1, error: null };
            }
            return { count: 1, error: null }; // At least the current user
          } catch (error) {
            // Workspace members table doesn't exist or error - fallback to assistants count
            console.log('Workspace members not available, using assistants count:', error);
            return { count: assistantIds.length || 1, error: null };
          }
        })();

        const [apiCallsResult, phoneMinutesResult, textMessagesResult, teamMembersResult] = await Promise.all([
          apiCallsPromise,
          phoneMinutesPromise,
          textMessagesPromise,
          teamMembersPromise
        ]);

        // Calculate usage
        const apiCallsCount = apiCallsResult.count || 0;
        const phoneMinutesTotal = phoneMinutesResult.data?.reduce((sum: number, call: any) => sum + (call.call_duration || 0), 0) || 0;
        const phoneMinutes = Math.round(phoneMinutesTotal / 60); // Convert seconds to minutes
        const textMessagesCount = textMessagesResult.count || 0;
        const teamMembersCount = teamMembersResult.count || 0;

        // Helper to parse limits from features
        const parseLimit = (featureKey: string): number | 'unlimited' => {
          if (planConfig.is_unlimited) return 'unlimited';
          const feature = planConfig.features?.find((f: string) => f.toLowerCase().includes(featureKey.toLowerCase()));
          if (!feature) return 'unlimited'; // Default to unlimited if not specified

          if (feature.toLowerCase().includes('unlimited')) return 'unlimited';

          const match = feature.match(/\d+/);
          return match ? parseInt(match[0].replace(/,/g, '')) : 'unlimited';
        };

        const apiCallsLimit = parseLimit('calls');
        const textMessagesLimit = parseLimit('messages');
        const teamMembersLimit = parseLimit('team');

        // Note: For now we maintain some defaults for non-unlimited plans if not specified in DB
        // but we prioritize is_unlimited flag.

        setUsage([
          { name: "API Calls", used: apiCallsCount, limit: apiCallsLimit, icon: Zap },
          { name: "Text Messages", used: textMessagesCount, limit: textMessagesLimit, icon: MessageSquare },
          { name: "Team Members", used: teamMembersCount, limit: teamMembersLimit, icon: Users }
        ]);

        // Fetch invoices and minutes purchases for billing history
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
                originalId: inv.id,
                date: invoiceDate.toISOString().split('T')[0],
                amount: `$${Number(inv.amount || 0).toFixed(2)}`,
                status: (inv.status || 'paid') as string
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

              // Determine if this is a credit or debit based on payment_method
              const isDebit = purchase.payment_method === 'whitelabel_customer_sale';
              const transactionType = isDebit ? 'debit' : 'credit';
              const minutes = purchase.minutes_purchased || 0;
              const amount = Number(purchase.amount_paid || 0);

              // Get description from notes or payment method
              let description = purchase.notes || '';
              if (purchase.payment_method === 'whitelabel_customer_sale') {
                description = `Sold ${minutes} minutes to customer`;
              } else if (purchase.payment_method === 'whitelabel_admin') {
                description = `Purchased ${minutes} minutes from admin`;
              }

              allInvoices.push({
                id: `MIN-${purchase.id.slice(0, 8)}`,
                originalId: purchase.id,
                paymentId: purchase.payment_id,
                date: purchaseDate.toISOString().split('T')[0],
                amount: isDebit ? `-$${amount.toFixed(2)}` : `$${amount.toFixed(2)}`,
                status: invoiceStatus,
                type: transactionType,
                minutes: minutes,
                description: description
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
  }, [user?.id, user?.plan, currentWorkspace?.id]);

  const handleDownloadInvoice = (invoice: Invoice) => {
    const formattedDate = new Date(invoice.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const descriptionRow = invoice.description
      ? `<div class="row"><span class="label">Description</span><span class="value">${invoice.description}</span></div>`
      : '';
    const minutesRow = invoice.minutes
      ? `<div class="row"><span class="label">Minutes</span><span class="value">${invoice.minutes}</span></div>`
      : '';

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
  ${descriptionRow}
  ${minutesRow}
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

    toast({
      title: "Receipt ready",
      description: "Your receipt has been opened for printing/saving.",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentPlan) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Billing</h1>
            <p className="text-muted-foreground">Manage your subscription, usage, and billing information</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Please sign in to view your billing information.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        {isTrialExpired && (
          <div className="mb-6 flex items-start gap-4 rounded-xl border border-destructive/40 bg-destructive/10 p-5">
            <AlertTriangle className="h-6 w-6 shrink-0 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-base font-semibold text-destructive">Your free trial has ended</p>
              <p className="text-sm text-destructive/80 mt-0.5">
                Your access to the platform has been paused. Upgrade to a paid plan to restore full access.
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => setIsChangePlanOpen(true)}
            >
              Upgrade Now
            </Button>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription, usage, and billing information</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Current Plan */}
          <div className="lg:col-span-2">
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan
                </CardTitle>
                <CardDescription>Your subscription details and next billing date</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{currentPlan.name}</h3>
                    <p className="text-muted-foreground">
                      {currentPlan.price}/{currentPlan.period}
                    </p>
                  </div>
                  <Badge className="bg-success/10 text-success border-success/20">
                    {currentPlan.status.charAt(0).toUpperCase() + currentPlan.status.slice(1)}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {currentPlan.nextBilling && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next billing date</span>
                      <span className="text-foreground font-medium">{currentPlan.nextBilling}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setIsChangePlanOpen(true)}>Change Plan</Button>
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setIsCancelDialogOpen(true)}
                      disabled={currentPlan.name.toLowerCase() === "free"}
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Minutes Balance Card */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {isMainAccount ? 'Minutes Balance' : `${currentWorkspace?.name} Minutes`}
              </CardTitle>
              <CardDescription>
                {isMainAccount ? 'Your total account minutes' : 'Minutes allocated to this workspace'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isMainAccount ? (
                // Main Account — show user-level balance
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className="text-2xl font-bold text-foreground">
                      {isUnlimited ? 'Unlimited' : (minutesBalance as number).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="text-foreground font-medium">{minutesUsed.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-foreground font-medium">
                      {isUnlimited ? 'Unlimited' : totalUserMinutes.toLocaleString()}
                    </span>
                  </div>
                  {!isUnlimited && totalUserMinutes > 0 && (
                    <Progress value={Math.min((minutesUsed / totalUserMinutes) * 100, 100)} className="h-1.5 mt-1" />
                  )}
                  <Button className="w-full mt-2" onClick={() => setIsPurchaseDialogOpen(true)}>
                    Purchase Minutes
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Minutes are purchased separately from your subscription plan
                  </p>
                </div>
              ) : (
                // Workspace view — show workspace-level minutes only
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className="text-2xl font-bold text-foreground">
                      {workspaceMinuteLimit === 0
                        ? 'No limit set'
                        : Math.max(0, workspaceMinuteLimit - workspaceMinutesUsed).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="text-foreground font-medium">{workspaceMinutesUsed.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Allocated limit</span>
                    <span className="text-foreground font-medium">
                      {workspaceMinuteLimit === 0 ? '—' : workspaceMinuteLimit.toLocaleString()}
                    </span>
                  </div>
                  {workspaceMinuteLimit > 0 && (
                    <Progress
                      value={Math.min((workspaceMinutesUsed / workspaceMinuteLimit) * 100, 100)}
                      className="h-1.5 mt-1"
                    />
                  )}
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    To purchase or adjust minutes, switch to Main Account
                  </p>
                </div>
              )}
            </CardContent>
          </Card>



          {/* Workspace Minutes Overview — Main Account only */}
          {isMainAccount && workspaceRows.length > 0 && (
            <div className="lg:col-span-3">
              <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Workspace Minutes Overview
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAssignMinutesOpen(true)}
                    >
                      Assign Minutes
                    </Button>
                  </div>
                  <CardDescription>
                    Minutes allocated and consumed across your workspaces.{' '}
                    {(() => {
                      const totalAssigned = workspaceRows.reduce((s, w) => s + w.minuteLimit, 0);
                      const unassigned = Math.max(0, totalUserMinutes - totalAssigned);
                      return `${totalAssigned.toLocaleString()} of ${totalUserMinutes.toLocaleString()} minutes assigned · ${unassigned.toLocaleString()} unassigned`;
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-border/40 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10 hover:bg-transparent">
                          <TableHead>Workspace</TableHead>
                          <TableHead className="text-right">Allocated</TableHead>
                          <TableHead className="text-right">Used</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                          <TableHead className="text-right">Usage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workspaceRows.map((ws) => {
                          const pct = ws.minuteLimit > 0 ? Math.min((ws.minutesUsed / ws.minuteLimit) * 100, 100) : 0;
                          const isExceeded = ws.minuteLimit > 0 && ws.minutesUsed > ws.minuteLimit;
                          return (
                            <TableRow key={ws.id} className="border-border/30">
                              <TableCell className="font-medium text-foreground">{ws.name}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {ws.minuteLimit === 0 ? '—' : ws.minuteLimit.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {ws.minutesUsed.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={isExceeded ? 'text-destructive font-medium' : 'text-foreground'}>
                                  {ws.minuteLimit === 0 ? '—' : ws.remaining.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {ws.minuteLimit === 0 ? (
                                  <span className="text-xs text-muted-foreground">No limit</span>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <Progress value={pct} className="h-1.5 w-20" />
                                    <span className={`text-xs font-medium w-8 text-right ${isExceeded ? 'text-destructive' : 'text-muted-foreground'}`}>
                                      {Math.round(pct)}%
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Summary row */}
                        <TableRow className="bg-muted/10 border-border/30 font-semibold">
                          <TableCell className="text-foreground">Total (all workspaces)</TableCell>
                          <TableCell className="text-right text-foreground">
                            {workspaceRows.reduce((s, w) => s + w.minuteLimit, 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-foreground">
                            {workspaceRows.reduce((s, w) => s + w.minutesUsed, 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-foreground">
                            {workspaceRows.reduce((s, w) => s + w.remaining, 0).toLocaleString()}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Billing History */}
          <div className="lg:col-span-3">
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Billing History
                </CardTitle>
                <CardDescription>Download invoices and view payment history</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No invoices available</p>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => {
                      const isDebit = invoice.type === 'debit' || invoice.amount?.startsWith('-');
                      const isCredit = invoice.type === 'credit' || (!invoice.type && !isDebit);

                      return (
                        <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{invoice.id}</p>
                                {isDebit && (
                                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                                    Debit
                                  </Badge>
                                )}
                                {isCredit && (
                                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                                    Credit
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{invoice.date}</p>
                              {invoice.description && (
                                <p className="text-xs text-muted-foreground mt-1">{invoice.description}</p>
                              )}
                              {invoice.minutes && (
                                <p className="text-xs text-muted-foreground">{invoice.minutes.toLocaleString()} minutes</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-medium ${isDebit ? 'text-destructive' : 'text-foreground'}`}>
                              {invoice.amount}
                            </span>
                            <Badge
                              variant="outline"
                              className="bg-success/10 text-success border-success/20"
                            >
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleDownloadInvoice(invoice)}
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Minutes Purchase Dialog */}
        <MinutesPurchaseDialog
          open={isPurchaseDialogOpen}
          onOpenChange={setIsPurchaseDialogOpen}
          currentBalance={minutesBalance === 'unlimited' ? 0 : minutesBalance}
          isUnlimited={isUnlimited}
          minutesUsed={minutesUsed}
          onPurchaseComplete={async () => {
            // Refresh minutes balance after purchase
            const { data: userData } = await supabase
              .from('users')
              .select('minutes_limit, minutes_used')
              .eq('id', user?.id)
              .single();

            if (userData) {
              const minutesLimit = userData.minutes_limit || 0;
              const minutesUsed = userData.minutes_used || 0;
              const remainingMinutes = Math.max(0, minutesLimit - minutesUsed);
              setMinutesBalance(remainingMinutes);
              setMinutesUsed(minutesUsed);
            }
          }}
        />

        {/* Change Plan Dialog */}
        <ChangePlanDialog
          open={isChangePlanOpen}
          onOpenChange={setIsChangePlanOpen}
          currentPlan={currentPlan?.name?.toLowerCase() || "free"}
          onPlanChanged={async (newPlan) => {
            setCurrentPlan(prev => prev ? { ...prev, name: newPlan } : null);
            // Refresh auth context so TrialExpiredGuard re-evaluates with cleared trial_ends_at
            await refreshProfile();
            if (isTrialExpired) {
              navigate('/dashboard');
            }
          }}
        />

        {/* Cancel Subscription Dialog */}
        <CancelSubscriptionDialog
          open={isCancelDialogOpen}
          onOpenChange={setIsCancelDialogOpen}
          currentPlan={currentPlan?.name || "Free"}
          onCancelled={() => {
            setCurrentPlan(prev => prev ? { ...prev, name: "Free", price: "$0" } : null);
          }}
        />

        {/* Assign Minutes to Workspace Dialog */}
        <AssignMinutesDialog
          open={isAssignMinutesOpen}
          onOpenChange={setIsAssignMinutesOpen}
          onAssigned={async () => {
            // Refresh workspace rows
            const { data: allWs } = await supabase
              .from('workspace_settings')
              .select('id, workspace_name, minute_limit, minutes_used')
              .eq('user_id', user?.id);
            if (allWs) {
              setWorkspaceRows(allWs.map((ws: any) => ({
                id: ws.id,
                name: ws.workspace_name,
                minuteLimit: ws.minute_limit || 0,
                minutesUsed: ws.minutes_used || 0,
                remaining: Math.max(0, (ws.minute_limit || 0) - (ws.minutes_used || 0)),
              })));
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
}