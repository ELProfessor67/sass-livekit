import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlanConfig, getPlanConfigs, type PlanConfig } from "@/lib/plan-config";
import { MinutesPurchaseDialog } from "@/components/settings/billing/MinutesPurchaseDialog";
import { ChangePlanDialog } from "@/components/settings/billing/ChangePlanDialog";
import {
  Check,
  Zap,
  Crown,
  Rocket,
  CreditCard,
  Calendar,
  TrendingUp,
  Users,
  Phone,
  BarChart3,
  Shield,
  Clock,
  History,
  Plus
} from "lucide-react";

// Plans will be generated from PLAN_CONFIGS
const planIcons = {
  starter: Zap,
  professional: Crown,
  enterprise: Rocket,
  free: Zap
};

const planColors = {
  starter: "from-blue-500 to-blue-600",
  professional: "from-purple-500 to-purple-600",
  enterprise: "from-orange-500 to-orange-600",
  free: "from-gray-500 to-gray-600"
};

export function PlansAndPricingSettings() {
  const { canManageBilling: canEdit } = useWorkspace();
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>(user?.plan || "free");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [usageStats, setUsageStats] = useState<{
    users: { used: number; limit: number; label: string };
    minutes: { used: number; limit: number; label: string };
  } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [plans, setPlans] = useState<Record<string, PlanConfig>>({});
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    if (user?.plan) {
      setSelectedPlan(user.plan);
    }
  }, [user?.plan]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const fetchedPlans = await getPlanConfigs();
        setPlans(fetchedPlans);
      } catch (error) {
        console.error('Error fetching plans:', error);
        setPlans({});
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    const fetchUsageStats = async () => {
      if (!user?.id) {
        setLoadingUsage(false);
        return;
      }

      try {
        setLoadingUsage(true);

        // Get current plan config
        const planConfig = getPlanConfig(user.plan);

        // Fetch assistants for the user
        const { data: assistantsData } = await supabase
          .from('assistant')
          .select('id')
          .eq('user_id', user.id);

        const assistantIds = assistantsData?.map(a => a.id) || [];

        // Fetch user data for limits — minutes come from Main Account workspace
        const { data: userData } = await supabase
          .from('users')
          .select('is_unlimited, plan')
          .eq('id', user.id)
          .single();

        // Fetch Main Account workspace minutes (order desc to get highest limit row)
        const { data: mainAccountWsRows } = await supabase
          .from('workspace_settings')
          .select('id, minute_limit, minutes_used')
          .eq('user_id', user.id)
          .eq('workspace_name', 'Main Account')
          .order('minute_limit', { ascending: false });

        let mainAccountWs = mainAccountWsRows?.[0] || null;
        let minutesLimit = mainAccountWs?.minute_limit || 0;
        const minutesUsed = mainAccountWs?.minutes_used || 0;
        const userIsUnlimited = !!userData?.is_unlimited;

        // Auto-apply free trial minutes if limit is still 0
        if (!userIsUnlimited && minutesLimit === 0 && minutesUsed === 0) {
          try {
            const { data: trialConfig } = await (supabase as any)
              .from('minutes_pricing_config')
              .select('free_trial_enabled, free_trial_minutes')
              .eq('tenant', 'main')
              .maybeSingle();

            if (trialConfig?.free_trial_enabled && trialConfig.free_trial_minutes > 0) {
              minutesLimit = trialConfig.free_trial_minutes;
            }
          } catch (_) {
            // trial config not available
          }
        }

        // Team Members - Count from workspace_members table
        let teamMembersUsed = 1;
        try {
          const { data: userWorkspaceMembers } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', user.id)
            .eq('status', 'active');

          if (userWorkspaceMembers && userWorkspaceMembers.length > 0) {
            const workspaceIds = [...new Set(userWorkspaceMembers.map(m => m.workspace_id))];
            const { count: membersCount } = await supabase
              .from('workspace_members')
              .select('*', { count: 'exact', head: true })
              .in('workspace_id', workspaceIds)
              .eq('status', 'active');
            teamMembersUsed = membersCount || 1;
          }
        } catch (error) {
          console.log('Workspace members not available, using assistants count:', error);
          teamMembersUsed = assistantIds.length || 1;
        }

        const teamMembersLimit = planConfig.features?.find((f: string) => f.includes('team'))
          ? parseInt(planConfig.features.find((f: string) => f.includes('team'))?.match(/\d+/)?.[0] || '10')
          : 10;

        setUsageStats({
          users: {
            used: teamMembersUsed,
            limit: teamMembersLimit,
            label: "Team Members"
          },
          minutes: {
            used: minutesUsed,
            limit: userIsUnlimited ? -1 : minutesLimit,
            label: "Available Minutes"
          }
        });
      } catch (error) {
        console.error('Error fetching usage stats:', error);
        setUsageStats({
          users: { used: 0, limit: 10, label: "Team Members" },
          minutes: { used: 0, limit: 0, label: "Available Minutes" }
        });
      } finally {
        setLoadingUsage(false);
      }
    };

    fetchUsageStats();
  }, [user?.id, user?.plan]);

  const handleUpgrade = async (planKey: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to upgrade your plan.",
        variant: "destructive"
      });
      return;
    }

    if (planKey === selectedPlan) {
      toast({
        title: "Already on this plan",
        description: "You are already subscribed to this plan."
      });
      return;
    }

    setIsUpgrading(true);
    try {
      const planConfig = getPlanConfig(planKey);

      // Update user plan
      const { error } = await supabase
        .from("users")
        .update({
          plan: planKey,
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      // Update local auth state
      await updateProfile({
        plan: planKey,
      });

      setSelectedPlan(planKey);

      toast({
        title: "Plan upgraded successfully! 🎉",
        description: `Your ${planConfig.name} plan is now active. Purchase minutes separately from the Billing page.`
      });
    } catch (error: any) {
      console.error("Error upgrading plan:", error);
      toast({
        title: "Upgrade failed",
        description: error?.message || "Failed to upgrade plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleBillingPortal = () => {
    toast({
      title: "Opening billing portal",
      description: "Redirecting to manage your subscription and billing."
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extralight tracking-tight text-foreground">Plans & Pricing</h2>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Choose the perfect plan for your business needs
        </p>
      </div>

      {/* Current Usage */}
      <Card className="backdrop-blur-xl bg-card/50 border border-border/50 rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-foreground">Current Usage</h3>
              <p className="text-sm text-muted-foreground">Your usage for this billing period</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl border-primary/20 hover:border-primary/40"
                onClick={() => setIsPurchaseDialogOpen(true)}
            >
                <Plus className="h-4 w-4 mr-2" />
                Purchase Minutes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loadingUsage ? (
            <div className="col-span-2 text-center py-4 text-muted-foreground">
              Loading usage data...
            </div>
          ) : usageStats ? (
            Object.entries(usageStats).map(([key, stat]) => {
              const percentage = stat.limit > 0 ? (stat.used / stat.limit) * 100 : 0;
              const isNearLimit = percentage > 80;
              const isTeamMembers = key === 'users';

              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{stat.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {stat.used.toLocaleString()} / {stat.limit === -1 ? '∞' : stat.limit > 0 ? stat.limit.toLocaleString() : '—'}
                    </span>
                  </div>
                  <Progress
                    value={stat.limit === -1 || stat.limit === 0 ? 0 : Math.min(percentage, 100)}
                    className={`h-2 ${isNearLimit && stat.limit > 0 ? 'bg-orange-200' : 'bg-secondary'}`}
                  />
                  {!isTeamMembers && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{stat.limit === -1 ? 'Unlimited' : stat.limit === 0 ? 'No limit set' : `${percentage.toFixed(1)}% used`}</span>
                      {isNearLimit && stat.limit > 0 && <span className="text-orange-500">Approaching limit</span>}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-4 text-muted-foreground">
              Unable to load usage data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {loadingPlans ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            Loading plans...
          </div>
        ) : Object.values(plans).filter(plan => plan.key !== 'free').length === 0 ? (
          <div className="col-span-3 text-center py-12">
            <p className="text-muted-foreground">No plans available at this time.</p>
          </div>
        ) : (
          Object.values(plans).filter(plan => plan.key !== 'free').map((planConfig) => {
            const IconComponent = planIcons[planConfig.key as keyof typeof planIcons] || Zap;
            const color = planColors[planConfig.key as keyof typeof planColors] || "from-gray-500 to-gray-600";
            const isCurrent = selectedPlan === planConfig.key;
            const isPopular = planConfig.key === 'professional';

            return (
              <Card
                key={planConfig.key}
                className={`relative backdrop-blur-xl border rounded-2xl transition-all hover:shadow-lg ${isPopular
                  ? 'bg-primary/5 border-primary/30 shadow-md'
                  : 'bg-card/50 border-border/50'
                  } ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto h-12 w-12 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center mb-4`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-light text-foreground">{planConfig.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extralight text-foreground">${planConfig.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Minutes purchased separately
                  </p>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-6">
                    {planConfig.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrent ? "secondary" : isPopular ? "default" : "outline"}
                    onClick={() => !isCurrent && canEdit && setIsChangePlanOpen(true)}
                    disabled={isCurrent || !canEdit}
                  >
                    {!canEdit ? "View Only" : isCurrent ? "Current Plan" : `Switch to ${planConfig.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Billing Management */}
      <Card className="backdrop-blur-xl bg-card/50 border border-border/50 rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-foreground">Billing Management</h3>
              <p className="text-sm text-muted-foreground">Manage your subscription and payment methods</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => canEdit && setIsChangePlanOpen(true)}
              disabled={!canEdit}
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Change Plan</p>
                  <p className="text-xs text-muted-foreground">Upgrade or downgrade your subscription</p>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Usage Analytics</p>
                  <p className="text-xs text-muted-foreground">Detailed usage reports and forecasting</p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Plan Dialog */}
      <ChangePlanDialog
          open={isChangePlanOpen}
          onOpenChange={setIsChangePlanOpen}
          currentPlan={selectedPlan}
          onPlanChanged={(newPlan) => {
              setSelectedPlan(newPlan);
              updateProfile?.({ plan: newPlan });
          }}
      />

      {/* Minutes Purchase Dialog */}
      <MinutesPurchaseDialog
          open={isPurchaseDialogOpen}
          onOpenChange={setIsPurchaseDialogOpen}
          currentBalance={usageStats?.minutes.limit === -1 ? 0 : (usageStats?.minutes.limit || 0) - (usageStats?.minutes.used || 0)}
          isUnlimited={usageStats?.minutes.limit === -1}
          minutesUsed={usageStats?.minutes.used || 0}
          onPurchaseComplete={async () => {
              // Refresh usage stats after purchase
              setLoadingUsage(true);
              // The useEffect with user?.id dependency will re-fetch
              // or we can manually call it
          }}
      />
    </div>
  );
}