import { useState, useEffect } from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Building2, AlertTriangle, Check, Minus, Plus } from "lucide-react";

interface Workspace {
    id: string;
    name: string;
    allocated: number;
    used: number;
    remaining: number;
}

interface PoolData {
    totalMinutes: number;
    usedMinutes: number;
    isUnlimited: boolean;
    totalAssigned: number;
    unassigned: number;
    workspaces: Workspace[];
}

interface AssignMinutesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAssigned?: () => void;
}

export function AssignMinutesDialog({ open, onOpenChange, onAssigned }: AssignMinutesDialogProps) {
    const [poolData, setPoolData] = useState<PoolData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [draftValues, setDraftValues] = useState<Record<string, number>>({});

    useEffect(() => {
        if (open) {
            fetchPoolData();
        }
    }, [open]);

    const fetchPoolData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("No session");

            const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:4000";
            const res = await fetch(`${backendUrl}/api/v1/subscription/workspace-minutes`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to fetch data");

            setPoolData(data.data);
            // Init draft values from current allocations
            const drafts: Record<string, number> = {};
            data.data.workspaces.forEach((ws: Workspace) => {
                drafts[ws.id] = ws.allocated;
            });
            setDraftValues(drafts);
        } catch (err: any) {
            toast.error(err.message || "Failed to load workspace data");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (workspaceId: string, workspaceName: string) => {
        const minutes = draftValues[workspaceId] ?? 0;
        setSaving(workspaceId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("No session");

            const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:4000";
            const res = await fetch(`${backendUrl}/api/v1/subscription/assign-workspace-minutes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ workspaceId, minutes })
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to assign minutes");

            toast.success(`Assigned ${minutes.toLocaleString()} minutes to "${workspaceName}"`);
            await fetchPoolData();
            onAssigned?.();
        } catch (err: any) {
            toast.error(err.message || "Failed to assign minutes");
        } finally {
            setSaving(null);
        }
    };

    const getTotalDraftAllocated = () => {
        return Object.values(draftValues).reduce((sum, v) => sum + (v || 0), 0);
    };

    const getUnassignedAfterDraft = () => {
        if (!poolData) return 0;
        return poolData.totalMinutes - getTotalDraftAllocated();
    };

    const isDraftOverBudget = (workspaceId: string) => {
        if (!poolData || poolData.isUnlimited) return false;
        const otherDrafts = Object.entries(draftValues)
            .filter(([id]) => id !== workspaceId)
            .reduce((sum, [, v]) => sum + (v || 0), 0);
        const thisValue = draftValues[workspaceId] ?? 0;
        return otherDrafts + thisValue > poolData.totalMinutes;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Assign Minutes to Workspaces
                    </DialogTitle>
                    <DialogDescription>
                        Distribute your minute pool across workspaces. Each workspace can use up to its allocated limit.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : !poolData ? (
                    <div className="text-center text-muted-foreground py-8">Failed to load data</div>
                ) : (
                    <div className="space-y-5">
                        {/* Pool Summary */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg border border-border/40 bg-muted/10 p-3 text-center">
                                <div className="text-xs text-muted-foreground mb-1">Total Pool</div>
                                <div className="text-xl font-bold text-foreground">
                                    {poolData.isUnlimited ? "∞" : poolData.totalMinutes.toLocaleString()}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border/40 bg-muted/10 p-3 text-center">
                                <div className="text-xs text-muted-foreground mb-1">Assigned</div>
                                <div className="text-xl font-bold text-foreground">
                                    {getTotalDraftAllocated().toLocaleString()}
                                </div>
                            </div>
                            <div className={`rounded-lg border p-3 text-center ${getUnassignedAfterDraft() < 0
                                ? "border-destructive/30 bg-destructive/5"
                                : "border-border/40 bg-muted/10"
                                }`}>
                                <div className="text-xs text-muted-foreground mb-1">Unassigned</div>
                                <div className={`text-xl font-bold ${getUnassignedAfterDraft() < 0 ? "text-destructive" : "text-foreground"}`}>
                                    {poolData.isUnlimited ? "∞" : getUnassignedAfterDraft().toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {!poolData.isUnlimited && poolData.totalMinutes > 0 && (
                            <Progress
                                value={Math.min((getTotalDraftAllocated() / poolData.totalMinutes) * 100, 100)}
                                className="h-1.5"
                            />
                        )}

                        {poolData.workspaces.length === 0 ? (
                            <div className="rounded-xl border border-border/40 bg-muted/5 p-8 text-center">
                                <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No workspaces found.</p>
                                <p className="text-xs text-muted-foreground mt-1">Create workspaces first to assign minutes.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {poolData.workspaces.map((ws) => {
                                    const draft = draftValues[ws.id] ?? ws.allocated;
                                    const hasChanged = draft !== ws.allocated;
                                    const overBudget = isDraftOverBudget(ws.id);
                                    const usagePct = ws.allocated > 0 ? Math.min((ws.used / ws.allocated) * 100, 100) : 0;

                                    return (
                                        <div key={ws.id} className={`rounded-xl border p-4 transition-colors ${overBudget ? "border-destructive/30 bg-destructive/5" : "border-border/40 bg-card/50"}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium text-foreground">{ws.name}</span>
                                                    {hasChanged && (
                                                        <Badge variant="outline" className="text-xs">Modified</Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {ws.used.toLocaleString()} used
                                                </div>
                                            </div>

                                            {ws.allocated > 0 && (
                                                <div className="mb-3">
                                                    <Progress value={usagePct} className="h-1" />
                                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                        <span>{ws.remaining.toLocaleString()} remaining</span>
                                                        <span>{Math.round(usagePct)}% used</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <div className="text-xs text-muted-foreground mb-1">Allocate minutes</div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0"
                                                            onClick={() => setDraftValues(prev => ({
                                                                ...prev,
                                                                [ws.id]: Math.max(0, (prev[ws.id] ?? ws.allocated) - 100)
                                                            }))}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            value={draft}
                                                            onChange={(e) => setDraftValues(prev => ({
                                                                ...prev,
                                                                [ws.id]: Math.max(0, parseInt(e.target.value) || 0)
                                                            }))}
                                                            className="h-8 text-center"
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0"
                                                            onClick={() => setDraftValues(prev => ({
                                                                ...prev,
                                                                [ws.id]: (prev[ws.id] ?? ws.allocated) + 100
                                                            }))}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={hasChanged ? "default" : "outline"}
                                                    onClick={() => handleAssign(ws.id, ws.name)}
                                                    disabled={saving === ws.id || overBudget}
                                                    className="self-end h-8"
                                                >
                                                    {saving === ws.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : hasChanged ? (
                                                        <><Check className="h-3 w-3 mr-1" />Apply</>
                                                    ) : (
                                                        "Saved"
                                                    )}
                                                </Button>
                                            </div>

                                            {overBudget && (
                                                <Alert variant="destructive" className="mt-2 py-2">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    <AlertDescription className="text-xs">
                                                        Exceeds available minute pool
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {poolData.totalMinutes === 0 && !poolData.isUnlimited && (
                            <Alert className="bg-orange-500/10 border-orange-500/30">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                <AlertDescription className="text-orange-700 dark:text-orange-400 text-sm">
                                    You have no minutes in your pool. Purchase minutes first to assign them to workspaces.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
