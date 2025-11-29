import React, { useState, useEffect } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Download, Calendar, Zap, Phone, MessageSquare, Users, Loader2, Clock } from "lucide-react";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { getPlanConfig, getPlanConfigs } from "@/lib/plan-config";
import { supabase } from "@/integrations/supabase/client";
import { MinutesPurchaseDialog } from "@/components/settings/billing/MinutesPurchaseDialog";

interface UsageItem {
  name: string;
  used: number;
  limit: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: string;
  type?: 'credit' | 'debit';
  minutes?: number;
  description?: string;
}

export default function Billing() {
  const { user } = useAuth();
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
  const [minutesBalance, setMinutesBalance] = useState(0);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0; // Unlimited
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
          .select('is_active, trial_ends_at, plan, minutes_limit, minutes_used, billing, stripe_customer_id, updated_at, tenant, slug_name')
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
                whitelabelEnabled: plan.whitelabel_enabled ?? false
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
                whitelabelEnabled: plan.whitelabel_enabled ?? false
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
        const minutesLimit = userData?.minutes_limit || 0;
        const minutesUsed = userData?.minutes_used || 0;
        const remainingMinutes = Math.max(0, minutesLimit - minutesUsed);
        setMinutesBalance(remainingMinutes);
        setMinutesUsed(minutesUsed);

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

        // Get limits from plan config (using reasonable defaults if not in plan config)
        const apiCallsLimit = planConfig.features?.find((f: string) => f.includes('calls'))
          ? parseInt(planConfig.features.find((f: string) => f.includes('calls'))?.match(/\d+/)?.[0] || '2500')
          : 2500;

        const textMessagesLimit = 2000; // Default, could be from plan config
        const teamMembersLimit = planConfig.features?.find((f: string) => f.includes('team'))
          ? parseInt(planConfig.features.find((f: string) => f.includes('team'))?.match(/\d+/)?.[0] || '10')
          : 10;

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
  }, [user?.id, user?.plan]);

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
                    <Button variant="outline">Change Plan</Button>
                    <Button variant="outline">Cancel Subscription</Button>
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
                Minutes Balance
              </CardTitle>
              <CardDescription>Your available call minutes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available</span>
                  <span className="text-2xl font-bold text-foreground">
                    {minutesBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used this month</span>
                  <span className="text-foreground font-medium">
                    {minutesUsed.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => setIsPurchaseDialogOpen(true)}
              >
                Purchase Minutes
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Minutes are purchased separately from your subscription plan
              </p>
            </CardContent>
          </Card>

          {/* Usage Overview */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
              <CardDescription>Current usage across all services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {usage.length === 0 ? (
                <p className="text-sm text-muted-foreground">No usage data available</p>
              ) : (
                usage.map((item) => {
                  const IconComponent = item.icon;
                  const percentage = getUsagePercentage(item.used, item.limit === Infinity ? 0 : item.limit);
                  const limitDisplay = item.limit === Infinity ? 'Unlimited' : item.limit.toLocaleString();
                  return (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{item.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {item.used.toLocaleString()} / {limitDisplay}
                        </span>
                      </div>
                      {item.limit !== Infinity && (
                        <Progress
                          value={percentage}
                          className="h-2"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

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
                            <Button variant="ghost" size="sm" className="gap-2">
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
          currentBalance={minutesBalance}
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
      </div>
    </DashboardLayout>
  );
}