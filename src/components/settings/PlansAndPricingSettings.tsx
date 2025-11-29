import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlanConfig, getPlanConfigs, type PlanConfig } from "@/lib/plan-config";
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
  Shield
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
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>(user?.plan || "free");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [usageStats, setUsageStats] = useState<{
    calls: { used: number; limit: number; label: string };
    storage: { used: number; limit: number; label: string };
    users: { used: number; limit: number; label: string };
  } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [plans, setPlans] = useState<Record<string, PlanConfig>>({});
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

        // Fetch user data for limits
        const { data: userData } = await supabase
          .from('users')
          .select('minutes_limit, plan')
          .eq('id', user.id)
          .single();

        // 1. API Calls (count from call_history for current month)
        const apiCallsResult = assistantIds.length > 0
          ? await supabase
            .from('call_history')
            .select('*', { count: 'exact', head: true })
            .in('assistant_id', assistantIds)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          : { count: 0, error: null };

        // 2. Storage - Calculate from knowledge base documents if available
        // Note: If you have a storage tracking system, replace this calculation
        let storageUsed = 0;
        try {
          // Try to fetch from knowledge_documents if table exists
          const { data: documentsData } = await supabase
            .from('knowledge_documents')
            .select('file_size, file_path')
            .eq('user_id', user.id);

          if (documentsData) {
            // Sum file sizes (assuming file_size is in bytes, convert to GB)
            const totalBytes = documentsData.reduce((sum: number, doc: any) => {
              const size = doc.file_size || 0;
              return sum + (typeof size === 'number' ? size : 0);
            }, 0);
            storageUsed = totalBytes / (1024 * 1024 * 1024); // Convert bytes to GB
          }
        } catch (error) {
          // Knowledge documents table doesn't exist or error - use 0
          console.log('Storage calculation not available:', error);
        }
        const storageLimit = 10; // Default, could be from plan config

        // 3. Team Members - Count from workspace_members table
        let teamMembersUsed = 1; // At least the current user
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

            teamMembersUsed = membersCount || 1;
          }
        } catch (error) {
          // Workspace members table doesn't exist or error - fallback to assistants count
          console.log('Workspace members not available, using assistants count:', error);
          teamMembersUsed = assistantIds.length || 1;
        }

        // Get limits from plan config
        const apiCallsLimit = 2500; // Default limit for API calls
        const teamMembersLimit = planConfig.features?.find((f: string) => f.includes('team'))
          ? parseInt(planConfig.features.find((f: string) => f.includes('team'))?.match(/\d+/)?.[0] || '10')
          : 10;

        setUsageStats({
          calls: {
            used: apiCallsResult.count || 0,
            limit: apiCallsLimit,
            label: "API Calls"
          },
          storage: {
            used: storageUsed,
            limit: storageLimit,
            label: "Storage (GB)"
          },
          users: {
            used: teamMembersUsed,
            limit: teamMembersLimit,
            label: "Team Members"
          }
        });
      } catch (error) {
        console.error('Error fetching usage stats:', error);
        // Set defaults on error
        setUsageStats({
          calls: { used: 0, limit: 2500, label: "API Calls" },
          storage: { used: 0, limit: 10, label: "Storage (GB)" },
          users: { used: 0, limit: 10, label: "Team Members" }
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
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loadingUsage ? (
            <div className="col-span-3 text-center py-4 text-muted-foreground">
              Loading usage data...
            </div>
          ) : usageStats ? (
            Object.entries(usageStats).map(([key, stat]) => {
              const percentage = (stat.used / stat.limit) * 100;
              const isNearLimit = percentage > 80;

              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{stat.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {typeof stat.used === 'number' && stat.used % 1 !== 0
                        ? stat.used.toFixed(1)
                        : stat.used.toLocaleString()} / {stat.limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className={`h-2 ${isNearLimit ? 'bg-orange-200' : 'bg-secondary'}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{percentage.toFixed(1)}% used</span>
                    {isNearLimit && <span className="text-orange-500">Approaching limit</span>}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 text-center py-4 text-muted-foreground">
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
                    onClick={() => !isCurrent && handleUpgrade(planConfig.key)}
                    disabled={isCurrent || isUpgrading}
                  >
                    {isUpgrading ? "Processing..." : isCurrent ? "Current Plan" : `Upgrade to ${planConfig.name}`}
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
              onClick={handleBillingPortal}
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Billing Portal</p>
                  <p className="text-xs text-muted-foreground">View invoices, update payment methods</p>
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
    </div>
  );
}