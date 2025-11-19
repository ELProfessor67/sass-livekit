import React, { useState, useEffect } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Download, Calendar, Zap, Phone, MessageSquare, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { getPlanConfig, getPlanConfigs } from "@/lib/plan-config";
import { supabase } from "@/integrations/supabase/client";

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

        // Fetch plan configs
        const configs = await getPlanConfigs();
        setPlanConfigs(configs);

        // Get current plan config
        const planConfig = configs[user.plan?.toLowerCase() || 'free'] || configs.free;

        // Fetch user data for subscription info
        const { data: userData } = await supabase
          .from('users')
          .select('is_active, trial_ends_at, plan, minutes_limit, minutes_used')
          .eq('id', user.id)
          .single();

        // Determine plan status
        const isActive = userData?.is_active ?? true;
        const status = isActive ? 'active' : 'inactive';

        // Calculate next billing date
        let nextBilling: string | null = null;
        if (userData?.trial_ends_at) {
          nextBilling = new Date(userData.trial_ends_at).toISOString().split('T')[0];
        } else if (planConfig.price > 0) {
          // If paid plan, calculate next billing (30 days from now)
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + 30);
          nextBilling = nextDate.toISOString().split('T')[0];
        }

        setCurrentPlan({
          name: planConfig.name,
          price: `$${planConfig.price}`,
          period: "month",
          status,
          nextBilling
        });

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
        
        const phoneMinutesLimit = userData?.minutes_limit ?? planConfig.minutesLimit ?? 1000;
        const textMessagesLimit = 2000; // Default, could be from plan config
        const teamMembersLimit = planConfig.features?.find((f: string) => f.includes('team')) 
          ? parseInt(planConfig.features.find((f: string) => f.includes('team'))?.match(/\d+/)?.[0] || '10')
          : 10;

        setUsage([
          { name: "API Calls", used: apiCallsCount, limit: apiCallsLimit, icon: Zap },
          { name: "Phone Minutes", used: phoneMinutes, limit: phoneMinutesLimit === 0 ? Infinity : phoneMinutesLimit, icon: Phone },
          { name: "Text Messages", used: textMessagesCount, limit: textMessagesLimit, icon: MessageSquare },
          { name: "Team Members", used: teamMembersCount, limit: teamMembersLimit, icon: Users }
        ]);

        // Fetch invoices (if invoices table exists)
        try {
          const { data: invoicesData, error: invoicesError } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (!invoicesError && invoicesData) {
            setInvoices(invoicesData.map((inv: any) => ({
              id: inv.id || inv.invoice_number || `INV-${inv.id?.slice(0, 8)}`,
              date: new Date(inv.created_at || inv.date).toISOString().split('T')[0],
              amount: `$${Number(inv.amount || 0).toFixed(2)}`,
              status: inv.status || 'paid'
            })));
          } else {
            // No invoices table or error - set empty array
            setInvoices([]);
          }
        } catch (error) {
          // Invoices table doesn't exist - set empty array
          console.log('Invoices table not available:', error);
          setInvoices([]);
        }

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
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium text-foreground">{invoice.id}</p>
                            <p className="text-sm text-muted-foreground">{invoice.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-foreground">{invoice.amount}</span>
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}