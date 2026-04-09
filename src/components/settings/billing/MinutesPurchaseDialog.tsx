import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, History, Plus, Check, AlertTriangle } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";

interface MinutesPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentBalance: number;
    minutesUsed: number;
    isUnlimited?: boolean;
    onPurchaseComplete?: () => void;
}

interface PricingConfig {
    price_per_minute: number;
    minimum_purchase: number;
    currency: string;
}

interface Purchase {
    id: string;
    minutes_purchased: number;
    amount_paid: number;
    currency: string;
    status: string;
    created_at: string;
    payment_method?: string;
}

interface PaymentMethod {
    id: string;
    stripe_payment_method_id: string;
    card_brand: string;
    card_last4: string;
    card_exp_month: number;
    card_exp_year: number;
    is_default: boolean;
}

// Stripe initialization (platform publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

function MinutesPurchaseDialogInner({
    open,
    onOpenChange,
    currentBalance,
    minutesUsed,
    isUnlimited,
    onPurchaseComplete
}: MinutesPurchaseDialogProps) {
    const stripe = useStripe();
    const elements = useElements();
    const { uiStyle } = useTheme();
    const isGlass = uiStyle === "glass";
    const [minutesToPurchase, setMinutesToPurchase] = useState<number>(100);
    const [pricing, setPricing] = useState<PricingConfig | null>(null);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingPricing, setLoadingPricing] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [showNewCardForm, setShowNewCardForm] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [adminMinutesWarning, setAdminMinutesWarning] = useState<{ available: number; requested: number } | null>(null);
    const [userProfile, setUserProfile] = useState<{ tenant: string; role: string; slug_name: string | null } | null>(null);

    // Fetch pricing configuration and payment methods
    useEffect(() => {
        if (open) {
            fetchPricing();
            fetchPurchaseHistory();
            fetchPaymentMethods();
            fetchUserProfile();
        }
    }, [open]);

    // Check admin minutes availability when minutes change (for whitelabel customers)
    useEffect(() => {
        if (open && userProfile && minutesToPurchase > 0) {
            checkAdminMinutesAvailability();
        }
    }, [open, minutesToPurchase, userProfile]);

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('users')
                .select('tenant, role, slug_name')
                .eq('id', user.id)
                .single();

            if (!error && data) {
                setUserProfile(data);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    const checkAdminMinutesAvailability = async () => {
        if (!userProfile) return;

        const tenant = userProfile.tenant || 'main';
        const isWhitelabelCustomer = tenant !== 'main' && userProfile.role !== 'admin' && !userProfile.slug_name;

        if (!isWhitelabelCustomer) {
            setAdminMinutesWarning(null);
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const response = await fetch(`${backendUrl}/api/v1/minutes/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ minutes: minutesToPurchase }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.warning && errorData.adminAvailable !== undefined) {
                    setAdminMinutesWarning({
                        available: errorData.adminAvailable,
                        requested: errorData.requested || minutesToPurchase,
                    });
                } else {
                    setAdminMinutesWarning(null);
                }
            } else {
                setAdminMinutesWarning(null);
            }
        } catch (error) {
            console.error('Error checking admin minutes:', error);
            setAdminMinutesWarning(null);
        }
    };

    const fetchPricing = async () => {
        try {
            setLoadingPricing(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error('No session found');
            }

            const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const response = await fetch(`${backendUrl}/api/v1/minutes-pricing`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch pricing');
            }

            const result = await response.json();
            if (result.success && result.data) {
                setPricing(result.data);
                // Set default purchase amount to minimum or 100, whichever is higher
                setMinutesToPurchase(Math.max(result.data.minimum_purchase || 0, 100));
            }
        } catch (error: any) {
            console.error('Error fetching pricing:', error);
            toast.error('Failed to load pricing information');
        } finally {
            setLoadingPricing(false);
        }
    };

    const fetchPurchaseHistory = async () => {
        try {
            setLoadingHistory(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const response = await fetch(`${backendUrl}/api/v1/minutes/purchase-history`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch purchase history');
            }

            const result = await response.json();
            if (result.success && result.data) {
                setPurchases(result.data.slice(0, 5)); // Show last 5 purchases
            }
        } catch (error: any) {
            console.error('Error fetching purchase history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            setLoadingPaymentMethods(true);
            const { data, error } = await (supabase as any)
                .from('payment_methods')
                .select('*')
                .eq('is_active', true)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching payment methods:', error);
                return;
            }

            if (data && data.length > 0) {
                setPaymentMethods(data);
                // Auto-select the default payment method
                const defaultMethod = data.find((pm: PaymentMethod) => pm.is_default);
                if (defaultMethod) {
                    setSelectedPaymentMethod(defaultMethod.id);
                } else {
                    setSelectedPaymentMethod(data[0].id);
                }
                setShowNewCardForm(false);
            } else {
                // No saved payment methods, show new card form
                setShowNewCardForm(true);
            }
        } catch (error: any) {
            console.error('Error fetching payment methods:', error);
            setShowNewCardForm(true);
        } finally {
            setLoadingPaymentMethods(false);
        }
    };

    const handlePurchase = async () => {
        if (!pricing) {
            toast.error('Pricing information not available');
            return;
        }

        if (pricing.minimum_purchase > 0 && minutesToPurchase < pricing.minimum_purchase) {
            toast.error(`Minimum purchase is ${pricing.minimum_purchase} minutes`);
            return;
        }

        if (minutesToPurchase <= 0) {
            toast.error('Please enter a valid number of minutes');
            return;
        }

        try {
            setLoading(true);
            setPaymentError(null);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error('No session found');
            }

            const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';

            // All purchases (new card or saved card) go through Stripe for real payment.
            // Minutes are credited by the Stripe webhook after payment succeeds.
            if (!stripe || !elements) {
                throw new Error('Payment system not ready. Please try again in a moment.');
            }

            // 1) Create PaymentIntent on backend (Stripe Connect, correct tenant routing)
            const intentResp = await fetch(`${backendUrl}/api/v1/minutes/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ minutes: minutesToPurchase }),
            });

            if (!intentResp.ok) {
                const errorData = await intentResp.json().catch(() => ({ error: 'Failed to start payment' }));

                if (errorData.warning && errorData.message) {
                    toast.error(errorData.message, {
                        duration: 8000,
                        description: `Available: ${errorData.adminAvailable} minutes | Requested: ${errorData.requested} minutes`,
                    });
                    throw new Error(errorData.message);
                }

                throw new Error(errorData.error || 'Failed to start payment');
            }

            const intentData = await intentResp.json();
            if (!intentData.success || !intentData.clientSecret) {
                throw new Error(intentData.error || 'Invalid payment intent response');
            }

            // 2) Determine payment method: saved card ID or new card element
            let paymentMethodParam: string | { card: any };
            let newPaymentMethod: any = null;

            if (showNewCardForm) {
                const cardElement = elements.getElement(CardElement);
                if (!cardElement) throw new Error('Card element not found');

                // Create PM explicitly so we have card details available to save
                const { paymentMethod: pm, error: pmError } = await stripe.createPaymentMethod({
                    type: 'card',
                    card: cardElement,
                });
                if (pmError) throw new Error(pmError.message || 'Failed to process card');
                newPaymentMethod = pm;
                paymentMethodParam = pm.id;
            } else {
                // Use the saved card's Stripe PM ID
                const savedPm = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
                if (!savedPm) throw new Error('Selected payment method not found');
                paymentMethodParam = savedPm.stripe_payment_method_id;
            }

            // 3) Confirm the payment
            const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                intentData.clientSecret,
                { payment_method: paymentMethodParam }
            );

            if (confirmError) {
                let errorMessage = confirmError.message || 'Payment failed';
                if (confirmError.code === 'resource_missing') {
                    errorMessage = 'PaymentIntent not found. Ensure VITE_STRIPE_PUBLISHABLE_KEY matches your backend STRIPE_SECRET account.';
                }
                setPaymentError(errorMessage);
                throw new Error(errorMessage);
            }

            if (paymentIntent?.status !== 'succeeded') {
                throw new Error(`Payment not completed (status: ${paymentIntent?.status || 'unknown'})`);
            }

            // 4) Save new card to payment_methods for future use
            if (showNewCardForm && newPaymentMethod?.card) {
                try {
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    if (currentUser) {
                        const isFirstCard = paymentMethods.length === 0;
                        // If adding a new default card, unset existing defaults first
                        if (isFirstCard) {
                            await (supabase as any)
                                .from('payment_methods')
                                .update({ is_default: false })
                                .eq('user_id', currentUser.id)
                                .eq('is_default', true);
                        }
                        await (supabase as any)
                            .from('payment_methods')
                            .insert({
                                user_id: currentUser.id,
                                stripe_payment_method_id: newPaymentMethod.id,
                                card_brand: newPaymentMethod.card.brand,
                                card_last4: newPaymentMethod.card.last4,
                                card_exp_month: newPaymentMethod.card.exp_month,
                                card_exp_year: newPaymentMethod.card.exp_year,
                                is_default: isFirstCard,
                                is_active: true,
                            });
                        await fetchPaymentMethods();
                    }
                } catch (saveErr) {
                    console.error('Failed to save payment method:', saveErr);
                    // Non-fatal — payment succeeded, card just won't be saved for reuse
                }
            }

            // Minutes will be credited by the Stripe webhook handler
            toast.success(`Payment successful! Your minutes will appear shortly.`);

            await fetchPurchaseHistory();
            if (onPurchaseComplete) {
                onPurchaseComplete();
            }
            // Reset to default amount
            setMinutesToPurchase(Math.max(pricing.minimum_purchase || 0, 100));
        } catch (error: any) {
            console.error('Error purchasing minutes:', error);
            const message = error?.message || 'Failed to purchase minutes';
            setPaymentError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = () => {
        if (!pricing) return '0.00';
        return (minutesToPurchase * pricing.price_per_minute).toFixed(2);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
            completed: { variant: "default", label: "Completed" },
            pending: { variant: "secondary", label: "Pending" },
            failed: { variant: "destructive", label: "Failed" },
            refunded: { variant: "outline", label: "Refunded" },
        };
        const config = variants[status] || { variant: "outline", label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getCardBrandDisplay = (brand: string) => {
        const brandMap: Record<string, string> = {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            discover: "Discover",
            diners: "Diners Club",
            jcb: "JCB",
            unionpay: "UnionPay",
        };
        return brandMap[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "sm:max-w-[600px] max-h-[90vh] overflow-y-auto",
                isGlass
                    ? "backdrop-blur-xl border rounded-2xl shadow-2xl " +
                      "bg-[hsl(214_60%_97%/0.88)] border-blue-200/60 shadow-blue-900/10 " +
                      "dark:bg-[hsl(224_32%_18%/0.82)] dark:border-[hsl(224_30%_45%/0.30)] dark:shadow-blue-900/40"
                    : "bg-card border-border"
            )}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Purchase Minutes
                    </DialogTitle>
                    <DialogDescription>
                        Buy additional minutes for your account. Minutes are used for calls and other services.
                        {userProfile?.role === 'admin' ? " As an admin, these minutes will be available for you to sell to your customers." : " These minutes will be added to your balance."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Current Balance */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={cn(
                            "rounded-lg border p-4",
                            isGlass
                                ? "border-blue-300/20 bg-blue-500/5 dark:border-blue-400/15 dark:bg-blue-500/10"
                                : "border-border/40 bg-muted/10"
                        )}>
                            <div className="text-sm text-muted-foreground">Current Balance</div>
                            <div className="text-2xl font-bold text-foreground">
                                {isUnlimited ? 'Unlimited' : currentBalance.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">minutes available</div>
                        </div>
                        <div className={cn(
                            "rounded-lg border p-4",
                            isGlass
                                ? "border-blue-300/20 bg-blue-500/5 dark:border-blue-400/15 dark:bg-blue-500/10"
                                : "border-border/40 bg-muted/10"
                        )}>
                            <div className="text-sm text-muted-foreground">Minutes Used</div>
                            <div className="text-2xl font-bold text-foreground">{minutesUsed.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">this period</div>
                        </div>
                    </div>

                    {/* Purchase Form */}
                    {loadingPricing ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : pricing ? (
                        <div className="space-y-4">
                            <div className={cn(
                                "rounded-lg border p-4",
                                isGlass
                                    ? "border-blue-300/20 bg-blue-500/5 dark:border-blue-400/15 dark:bg-blue-500/10"
                                    : "border-border/40 bg-muted/10"
                            )}>
                                <div className="text-sm text-muted-foreground mb-2">Pricing</div>
                                <div className="text-lg font-semibold text-foreground">
                                    ${pricing.price_per_minute.toFixed(2)} per minute
                                </div>
                                {pricing.minimum_purchase > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Minimum purchase: {pricing.minimum_purchase} minutes
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="minutes-amount">Number of Minutes</Label>
                                <Input
                                    id="minutes-amount"
                                    type="number"
                                    min={pricing.minimum_purchase || 1}
                                    value={minutesToPurchase}
                                    onChange={(e) => setMinutesToPurchase(Math.max(pricing.minimum_purchase || 1, Number(e.target.value)))}
                                    placeholder="Enter number of minutes"
                                />
                            </div>

                            {/* Admin Minutes Warning for Whitelabel Customers */}
                            {adminMinutesWarning && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="font-semibold mb-1">Insufficient Minutes Available</div>
                                        <div className="text-sm">
                                            Your administrator currently has <strong>{adminMinutesWarning.available.toLocaleString()}</strong> minutes available, 
                                            but you're trying to purchase <strong>{adminMinutesWarning.requested.toLocaleString()}</strong> minutes.
                                        </div>
                                        <div className="text-sm mt-2">
                                            Please contact your administrator to purchase more minutes, or reduce your purchase amount.
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Payment Method Selection */}
                            <div className="space-y-3">
                                <Label>Payment Method</Label>
                                {loadingPaymentMethods ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <>
                                        {paymentMethods.length > 0 && !showNewCardForm && (
                                            <RadioGroup value={selectedPaymentMethod || undefined} onValueChange={setSelectedPaymentMethod}>
                                                {paymentMethods.map((pm) => (
                                                    <div key={pm.id} className={cn(
                                                        "flex items-center space-x-3 rounded-lg border p-3 transition-colors",
                                                        isGlass
                                                            ? "border-blue-300/20 hover:bg-blue-500/5 dark:border-blue-400/15 dark:hover:bg-blue-500/10"
                                                            : "border-border/40 hover:bg-muted/10"
                                                    )}>
                                                        <RadioGroupItem value={pm.id} id={pm.id} />
                                                        <label htmlFor={pm.id} className="flex-1 flex items-center justify-between cursor-pointer">
                                                            <div className="flex items-center gap-3">
                                                                <CreditCard className="h-5 w-5 text-muted-foreground" />
                                                                <div>
                                                                    <div className="font-medium text-sm text-foreground">
                                                                        {getCardBrandDisplay(pm.card_brand)} •••• {pm.card_last4}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Expires {pm.card_exp_month}/{pm.card_exp_year}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {pm.is_default && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    <Check className="h-3 w-3 mr-1" />
                                                                    Default
                                                                </Badge>
                                                            )}
                                                        </label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        )}

                                        {showNewCardForm ? (
                                            <div className={cn(
                                                "rounded-lg border p-4 space-y-3",
                                                isGlass
                                                    ? "border-blue-300/20 bg-blue-500/5 dark:border-blue-400/15 dark:bg-blue-500/10"
                                                    : "border-border/40 bg-muted/10"
                                            )}>
                                                <p className="text-sm text-foreground/80">
                                                    Enter your card details to pay securely with Stripe. Your whitelabel
                                                    admin (or main account) will receive payouts via Stripe Connect.
                                                </p>
                                                <div className={cn(
                                                    "mt-2 p-3 rounded-md border",
                                                    isGlass
                                                        ? "bg-blue-950/20 border-blue-400/20 dark:bg-blue-900/20"
                                                        : "bg-background/40 border-border/40"
                                                )}>
                                                    <CardElement
                                                        options={{
                                                            style: {
                                                                base: {
                                                                    fontSize: '16px',
                                                                    color: 'var(--foreground, #e2e8f0)',
                                                                    '::placeholder': { color: '#94a3b8' },
                                                                },
                                                                invalid: { color: '#ef4444' },
                                                            },
                                                        }}
                                                    />
                                                </div>
                                                {paymentError && (
                                                    <p className="text-xs text-destructive mt-2">
                                                        {paymentError}
                                                    </p>
                                                )}
                                            </div>
                                        ) : paymentMethods.length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowNewCardForm(true)}
                                                className="w-full"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add New Card
                                            </Button>
                                        )}

                                        {showNewCardForm && paymentMethods.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowNewCardForm(false)}
                                                className="w-full"
                                            >
                                                Use Saved Card
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className={cn(
                                "rounded-lg border p-4",
                                isGlass
                                    ? "border-blue-400/25 bg-blue-500/10 dark:border-blue-400/20 dark:bg-blue-500/15"
                                    : "border-border/40 bg-primary/5"
                            )}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-foreground">Total Cost:</span>
                                    <span className="text-2xl font-bold text-foreground">
                                        ${calculateTotal()} {pricing.currency}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-4">
                            Failed to load pricing information
                        </div>
                    )}

                    {/* Purchase History */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm text-foreground font-medium">Recent Purchases</h3>
                        </div>
                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : purchases.length > 0 ? (
                            <div className={cn(
                                "rounded-lg border",
                                isGlass
                                    ? "border-blue-300/20 dark:border-blue-400/15"
                                    : "border-border/40"
                            )}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-foreground">Date</TableHead>
                                            <TableHead className="text-foreground">Minutes</TableHead>
                                            <TableHead className="text-foreground">Amount</TableHead>
                                            <TableHead className="text-foreground">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {purchases.map((purchase) => (
                                            <TableRow key={purchase.id}>
                                                <TableCell className="text-xs text-foreground">
                                                    {new Date(purchase.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-foreground">{purchase.minutes_purchased.toLocaleString()}</TableCell>
                                                <TableCell className="text-foreground">
                                                    ${purchase.amount_paid.toFixed(2)} {purchase.currency}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className={cn(
                                "text-center text-sm text-muted-foreground py-4 rounded-lg border",
                                isGlass
                                    ? "border-blue-300/20 dark:border-blue-400/15"
                                    : "border-border/40"
                            )}>
                                No purchase history yet
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handlePurchase} 
                        disabled={loading || !pricing || (!showNewCardForm && !selectedPaymentMethod)}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            `Purchase ${minutesToPurchase} Minutes`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function MinutesPurchaseDialog(props: MinutesPurchaseDialogProps) {
    return (
        <Elements stripe={stripePromise}>
            <MinutesPurchaseDialogInner {...props} />
        </Elements>
    );
}
