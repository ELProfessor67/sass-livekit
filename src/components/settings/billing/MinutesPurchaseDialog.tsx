import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, History, Plus, Check } from "lucide-react";

interface MinutesPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentBalance: number;
    minutesUsed: number;
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

export function MinutesPurchaseDialog({
    open,
    onOpenChange,
    currentBalance,
    minutesUsed,
    onPurchaseComplete
}: MinutesPurchaseDialogProps) {
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

    // Fetch pricing configuration and payment methods
    useEffect(() => {
        if (open) {
            fetchPricing();
            fetchPurchaseHistory();
            fetchPaymentMethods();
        }
    }, [open]);

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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error('No session found');
            }

            const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const response = await fetch(`${backendUrl}/api/v1/minutes/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ minutes: minutesToPurchase }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to purchase minutes' }));
                throw new Error(errorData.error || 'Failed to purchase minutes');
            }

            const result = await response.json();
            if (result.success) {
                toast.success(result.message || `Successfully purchased ${minutesToPurchase} minutes`);
                await fetchPurchaseHistory();
                if (onPurchaseComplete) {
                    onPurchaseComplete();
                }
                // Reset to default amount
                setMinutesToPurchase(Math.max(pricing.minimum_purchase || 0, 100));
            } else {
                throw new Error(result.error || 'Purchase failed');
            }
        } catch (error: any) {
            console.error('Error purchasing minutes:', error);
            toast.error(error.message || 'Failed to purchase minutes');
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Purchase Minutes
                    </DialogTitle>
                    <DialogDescription>
                        Buy additional minutes for your account. Minutes are used for calls and other services.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Current Balance */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                            <div className="text-sm text-muted-foreground">Current Balance</div>
                            <div className="text-2xl font-bold text-foreground">{currentBalance.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">minutes available</div>
                        </div>
                        <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
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
                            <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                                <div className="text-sm text-muted-foreground mb-2">Pricing</div>
                                <div className="text-lg font-semibold text-foreground">
                                    ${pricing.price_per_minute.toFixed(4)} per minute
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
                                                    <div key={pm.id} className="flex items-center space-x-3 rounded-lg border border-border/40 p-3 hover:bg-muted/10 transition-colors">
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
                                            <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                                                <p className="text-sm text-white mb-2">
                                                    New card form will be integrated with Stripe Elements here
                                                </p>
                                                <p className="text-xs text-white">
                                                    For now, using demo mode (auto-completes purchase)
                                                </p>
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

                            <div className="rounded-lg border border-border/40 bg-primary/5 p-4">
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
                        <div className="flex items-center text-white gap-2">
                            <History className="h-4 w-4 text-white" />
                            <h3 className="text-sm text-white font-medium">Recent Purchases</h3>
                        </div>
                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : purchases.length > 0 ? (
                            <div className="rounded-lg border border-border/40">
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
                            <div className="text-center text-sm text-muted-foreground py-4 rounded-lg border border-border/40">
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
