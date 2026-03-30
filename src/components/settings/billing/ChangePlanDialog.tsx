import React, { useState, useEffect } from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPlanConfigs, type PlanConfig } from "@/lib/plan-config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2, AlertTriangle, ArrowUp, ArrowDown, Minus, Zap, Crown, Rocket } from "lucide-react";

interface ChangePlanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPlan: string;
    onPlanChanged?: (newPlan: string) => void;
}

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    free: Zap,
    starter: Zap,
    professional: Crown,
    enterprise: Rocket
};

const planOrder: Record<string, number> = { free: 0, starter: 1, professional: 2, enterprise: 3 };

type Step = "select" | "confirm";

export function ChangePlanDialog({ open, onOpenChange, currentPlan, onPlanChanged }: ChangePlanDialogProps) {
    const [step, setStep] = useState<Step>("select");
    const [plans, setPlans] = useState<Record<string, PlanConfig>>({});
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setStep("select");
            setSelectedPlan(null);
            fetchPlans();
        }
    }, [open]);

    const fetchPlans = async () => {
        try {
            setLoadingPlans(true);
            const configs = await getPlanConfigs();
            setPlans(configs);
        } catch {
            toast.error("Failed to load plans");
        } finally {
            setLoadingPlans(false);
        }
    };

    const getChangeType = (targetPlan: string): "upgrade" | "downgrade" | "same" => {
        const currentOrder = planOrder[currentPlan.toLowerCase()] ?? 0;
        const targetOrder = planOrder[targetPlan.toLowerCase()] ?? 0;
        if (targetOrder > currentOrder) return "upgrade";
        if (targetOrder < currentOrder) return "downgrade";
        return "same";
    };

    const handleSelectPlan = (planKey: string) => {
        if (planKey === currentPlan.toLowerCase()) return;
        setSelectedPlan(planKey);
        setStep("confirm");
    };

    const handleConfirm = async () => {
        if (!selectedPlan) return;
        setProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("No session");

            const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:4000";
            const res = await fetch(`${backendUrl}/api/v1/subscription/change-plan`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ plan: selectedPlan })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to change plan");
            }

            const planConfig = plans[selectedPlan];
            toast.success(`Plan changed to ${planConfig?.name || selectedPlan}`);
            onPlanChanged?.(selectedPlan);
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to change plan");
        } finally {
            setProcessing(false);
        }
    };

    const selectedPlanConfig = selectedPlan ? plans[selectedPlan] : null;
    const changeType = selectedPlan ? getChangeType(selectedPlan) : "same";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {step === "select" ? "Change Plan" : "Confirm Plan Change"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "select"
                            ? "Select a new plan. Changes take effect immediately."
                            : "Review your plan change before confirming."}
                    </DialogDescription>
                </DialogHeader>

                {step === "select" && (
                    <div className="space-y-4">
                        {loadingPlans ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.values(plans).map((plan) => {
                                    const isCurrent = plan.key.toLowerCase() === currentPlan.toLowerCase();
                                    const type = getChangeType(plan.key);
                                    const Icon = planIcons[plan.key] || Zap;

                                    return (
                                        <button
                                            key={plan.key}
                                            onClick={() => handleSelectPlan(plan.key)}
                                            disabled={isCurrent}
                                            className={`relative text-left rounded-xl border p-4 transition-all focus:outline-none
                                                ${isCurrent
                                                    ? "border-primary/40 bg-primary/5 cursor-default opacity-80"
                                                    : "border-border/50 bg-card/50 hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <Icon className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-foreground">{plan.name}</div>
                                                        <div className="text-sm text-muted-foreground">${plan.price}/month</div>
                                                    </div>
                                                </div>
                                                {isCurrent && (
                                                    <Badge variant="secondary" className="text-xs">Current</Badge>
                                                )}
                                                {!isCurrent && type === "upgrade" && (
                                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                                        <ArrowUp className="h-3 w-3 mr-1" />Upgrade
                                                    </Badge>
                                                )}
                                                {!isCurrent && type === "downgrade" && (
                                                    <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
                                                        <ArrowDown className="h-3 w-3 mr-1" />Downgrade
                                                    </Badge>
                                                )}
                                            </div>
                                            <ul className="space-y-1.5">
                                                {plan.features.slice(0, 4).map((feature, i) => (
                                                    <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                        {feature}
                                                    </li>
                                                ))}
                                                {plan.features.length > 4 && (
                                                    <li className="text-xs text-muted-foreground pl-5">
                                                        +{plan.features.length - 4} more
                                                    </li>
                                                )}
                                            </ul>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {step === "confirm" && selectedPlanConfig && (
                    <div className="space-y-5">
                        <div className="rounded-xl border border-border/40 bg-muted/10 p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-muted-foreground mb-1">Changing from</div>
                                    <div className="font-semibold text-foreground capitalize">{currentPlan}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {changeType === "upgrade" && <ArrowUp className="h-5 w-5 text-green-500" />}
                                    {changeType === "downgrade" && <ArrowDown className="h-5 w-5 text-orange-500" />}
                                    {changeType === "same" && <Minus className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground mb-1">Changing to</div>
                                    <div className="font-semibold text-foreground">{selectedPlanConfig.name}</div>
                                    <div className="text-sm text-muted-foreground">${selectedPlanConfig.price}/month</div>
                                </div>
                            </div>
                        </div>

                        {changeType === "downgrade" && (
                            <Alert variant="destructive" className="bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="font-semibold mb-1">Downgrading your plan</div>
                                    <p className="text-sm">
                                        You may lose access to features included in your current plan.
                                        Your data is preserved and minutes are not affected.
                                    </p>
                                </AlertDescription>
                            </Alert>
                        )}

                        {changeType === "upgrade" && (
                            <Alert className="bg-green-500/10 border-green-500/30">
                                <Check className="h-4 w-4 text-green-500" />
                                <AlertDescription className="text-green-700 dark:text-green-400">
                                    <div className="font-semibold mb-1">Upgrading your plan</div>
                                    <p className="text-sm">
                                        New features will be available immediately after confirmation.
                                        Minutes are purchased separately.
                                    </p>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                            <div className="text-sm font-medium text-foreground mb-3">
                                {selectedPlanConfig.name} includes:
                            </div>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {selectedPlanConfig.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    {step === "select" ? (
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep("select")} disabled={processing}>
                                Back
                            </Button>
                            <Button onClick={handleConfirm} disabled={processing}>
                                {processing ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                                ) : (
                                    `Confirm ${changeType === "upgrade" ? "Upgrade" : changeType === "downgrade" ? "Downgrade" : "Change"}`
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
