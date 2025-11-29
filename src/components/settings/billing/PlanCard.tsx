import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  SectionHeading,
  BodyText
} from "@/components/ui/typography";

interface UsageMetric {
  used: number;
  total: number;
  percentage: number;
}

interface PlanDetails {
  name: string;
  price: number;
  period: string;
  validUntil: string;
  usage: {
    storage: UsageMetric;
    agents: UsageMetric;
  };
}

interface PlanCardProps {
  planDetails: PlanDetails;
  onDismissAlert: () => void;
  showExpirationAlert: boolean;
}

export function PlanCard({ planDetails, onDismissAlert, showExpirationAlert }: PlanCardProps) {
  return (
    <Card className="border-border/40 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <SectionHeading>Current Plan</SectionHeading>
          <BodyText>Your current subscription details</BodyText>
        </div>
        <Button variant="outline">Change Plan</Button>
      </CardHeader>
      <CardContent className="pt-4 space-y-8">
        {showExpirationAlert && (
          <div className="rounded-md bg-amber-500/15 border border-amber-600/30 p-3 mb-4 flex">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-500">Plan expiring soon</p>
              <p className="text-xs text-amber-400 mt-0.5">Your plan will automatically renew on {planDetails.validUntil}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto -mr-1"
              onClick={onDismissAlert}
            >
              <span className="sr-only">Dismiss</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-amber-500"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </Button>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">{planDetails.name} Plan</h3>
            <p className="text-muted-foreground">{planDetails.period} subscription</p>
          </div>
          <div className="mt-2 md:mt-0">
            <p className="text-3xl font-bold">${planDetails.price}<span className="text-muted-foreground text-base font-normal">/mo</span></p>
          </div>
        </div>

        <div className="space-y-4">
          <UsageMetric
            label="Storage"
            used={planDetails.usage.storage.used}
            total={planDetails.usage.storage.total}
            percentage={planDetails.usage.storage.percentage}
            unit="GB"
          />

          <UsageMetric
            label="Active Agents"
            used={planDetails.usage.agents.used}
            total={planDetails.usage.agents.total}
            percentage={planDetails.usage.agents.percentage}
            unit="agents"
          />
        </div>

        <div className="pt-2">
          <Button className="w-full sm:w-auto">
            Upgrade Plan <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface UsageMetricProps {
  label: string;
  used: number;
  total: number;
  percentage: number;
  unit: string;
}

function UsageMetric({ label, used, total, percentage, unit }: UsageMetricProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span>{used}/{total} {unit}</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
