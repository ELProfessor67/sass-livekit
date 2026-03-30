import { useState } from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

interface CancelSubscriptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPlan: string;
    onCancelled?: () => void;
}

const CANCEL_REASONS = [
    { value: "too_expensive", label: "Too expensive" },
    { value: "missing_features", label: "Missing features I need" },
    { value: "not_using", label: "Not using it enough" },
    { value: "switching_competitor", label: "Switching to a competitor" },
    { value: "technical_issues", label: "Too many technical issues" },
    { value: "other", label: "Other reason" }
];

const LOST_FEATURES = [
    "Access to premium AI models",
    "Priority customer support",
    "Advanced analytics & reporting",
    "Team collaboration features",
    "Custom integrations",
    "Higher usage limits"
];

type Step = "reason" | "confirm" | "done";

export function CancelSubscriptionDialog({
    open,
    onOpenChange,
    currentPlan,
    onCancelled
}: CancelSubscriptionDialogProps) {
    const [step, setStep] = useState<Step>("reason");
    const [reason, setReason] = useState("");
    const [feedback, setFeedback] = useState("");
    const [processing, setProcessing] = useState(false);
    const [accessUntil, setAccessUntil] = useState<string | null>(null);

    const handleClose = () => {
        if (step === "done") {
            onCancelled?.();
        }
        onOpenChange(false);
        // Reset after close
        setTimeout(() => {
            setStep("reason");
            setReason("");
            setFeedback("");
            setAccessUntil(null);
        }, 300);
    };

    const handleCancel = async () => {
        setProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("No session");

            const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:4000";
            const res = await fetch(`${backendUrl}/api/v1/subscription/cancel`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ reason, feedback, immediate: false })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to cancel subscription");
            }

            if (data.accessUntil) {
                setAccessUntil(new Date(data.accessUntil).toLocaleDateString());
            }
            setStep("done");
        } catch (err: any) {
            toast.error(err.message || "Failed to cancel subscription");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step === "done" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        {step === "done" ? "Subscription Cancelled" : "Cancel Subscription"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "reason" && "We're sorry to see you go. Help us improve by sharing why you're leaving."}
                        {step === "confirm" && "Please review what you'll lose before confirming cancellation."}
                        {step === "done" && "Your subscription has been cancelled."}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Reason */}
                {step === "reason" && (
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <Label>Why are you cancelling? (optional)</Label>
                            <RadioGroup value={reason} onValueChange={setReason}>
                                {CANCEL_REASONS.map((r) => (
                                    <div key={r.value} className="flex items-center space-x-3 rounded-lg border border-border/40 p-3 hover:bg-muted/10 transition-colors cursor-pointer">
                                        <RadioGroupItem value={r.value} id={r.value} />
                                        <label htmlFor={r.value} className="flex-1 cursor-pointer text-sm text-foreground">
                                            {r.label}
                                        </label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="feedback">Additional feedback (optional)</Label>
                            <Textarea
                                id="feedback"
                                placeholder="Tell us more about your experience..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Confirm - show what will be lost */}
                {step === "confirm" && (
                    <div className="space-y-5">
                        <Alert variant="destructive" className="bg-destructive/5 border-destructive/30">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="font-semibold mb-1">You are about to cancel your {currentPlan} plan</div>
                                <p className="text-sm">Your account will be downgraded to the free tier. You will lose access to:</p>
                            </AlertDescription>
                        </Alert>

                        <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-2">
                            {LOST_FEATURES.map((feature, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                                    {feature}
                                </div>
                            ))}
                        </div>

                        <div className="rounded-xl border border-border/40 bg-muted/10 p-4 space-y-2">
                            <div className="text-sm font-medium text-foreground">What's preserved:</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                Your account data and history
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                Unused purchased minutes remain in your balance
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                You can re-subscribe at any time
                            </div>
                        </div>

                        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 text-sm text-orange-700 dark:text-orange-400">
                            Cancellation takes effect at the end of your current billing period. You'll retain access to {currentPlan} features until then.
                        </div>
                    </div>
                )}

                {/* Step 3: Done */}
                {step === "done" && (
                    <div className="space-y-4 py-2">
                        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 text-center">
                            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                            <div className="font-semibold text-foreground mb-1">Cancellation confirmed</div>
                            <p className="text-sm text-muted-foreground">
                                Your plan has been downgraded to Free.
                                {accessUntil && ` You'll have access to ${currentPlan} features until ${accessUntil}.`}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary">Free</Badge>
                                <span>Your new plan</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                You can upgrade again at any time from the Plans & Pricing page.
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    {step === "reason" && (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Keep my plan
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => setStep("confirm")}
                                className="bg-destructive/80 hover:bg-destructive"
                            >
                                Continue to cancel
                            </Button>
                        </>
                    )}
                    {step === "confirm" && (
                        <>
                            <Button variant="outline" onClick={() => setStep("reason")} disabled={processing}>
                                Back
                            </Button>
                            <Button variant="destructive" onClick={handleCancel} disabled={processing}>
                                {processing ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelling...</>
                                ) : (
                                    "Yes, cancel my subscription"
                                )}
                            </Button>
                        </>
                    )}
                    {step === "done" && (
                        <Button onClick={handleClose}>
                            Close
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
