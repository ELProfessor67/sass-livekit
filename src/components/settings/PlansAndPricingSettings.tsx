import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
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

const plans = [
  {
    name: "Starter",
    price: "$19",
    period: "per month",
    description: "Perfect for small teams getting started",
    current: false,
    popular: false,
    features: [
      "Up to 500 calls/month",
      "Basic analytics",
      "Email support",
      "2 team members",
      "Standard integrations"
    ],
    icon: Zap,
    color: "from-blue-500 to-blue-600"
  },
  {
    name: "Professional",
    price: "$49",
    period: "per month", 
    description: "Advanced features for growing businesses",
    current: true,
    popular: true,
    features: [
      "Up to 2,500 calls/month",
      "Advanced analytics & reporting",
      "Priority support",
      "10 team members",
      "All integrations",
      "Custom branding"
    ],
    icon: Crown,
    color: "from-purple-500 to-purple-600"
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "per month",
    description: "Complete solution for large organizations",
    current: false,
    popular: false,
    features: [
      "Unlimited calls",
      "Real-time analytics",
      "24/7 phone support",
      "Unlimited team members",
      "Enterprise integrations",
      "Advanced security",
      "Dedicated account manager"
    ],
    icon: Rocket,
    color: "from-orange-500 to-orange-600"
  }
];

const usageStats = {
  calls: { used: 1250, limit: 2500, label: "API Calls" },
  storage: { used: 2.4, limit: 10, label: "Storage (GB)" },
  users: { used: 4, limit: 10, label: "Team Members" }
};

export function PlansAndPricingSettings() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState("professional");

  const handleUpgrade = (planName: string) => {
    toast({
      title: "Plan upgrade initiated",
      description: `Upgrading to ${planName} plan. You'll be redirected to payment.`
    });
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
          {Object.entries(usageStats).map(([key, stat]) => {
            const percentage = (stat.used / stat.limit) * 100;
            const isNearLimit = percentage > 80;
            
            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{stat.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {stat.used.toLocaleString()} / {stat.limit.toLocaleString()}
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
          })}
        </CardContent>
      </Card>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const IconComponent = plan.icon;
          const isCurrent = plan.current;
          
          return (
            <Card 
              key={plan.name}
              className={`relative backdrop-blur-xl border rounded-2xl transition-all hover:shadow-lg ${
                plan.popular 
                  ? 'bg-primary/5 border-primary/30 shadow-md' 
                  : 'bg-card/50 border-border/50'
              } ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}
            >
              {plan.popular && (
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
                <div className={`mx-auto h-12 w-12 rounded-xl bg-gradient-to-r ${plan.color} flex items-center justify-center mb-4`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extralight text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>

              <CardContent className="pt-0">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full"
                  variant={isCurrent ? "secondary" : plan.popular ? "default" : "outline"}
                  onClick={() => !isCurrent && handleUpgrade(plan.name)}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
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