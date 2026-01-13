import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edge } from "@xyflow/react";
import { ArrowsDownUp, Info, Trash } from "phosphor-react";

interface EdgeConfigPanelProps {
    edge: Edge;
    onUpdate: (edgeId: string, data: any) => void;
    onDelete?: (edgeId: string) => void;
}

export function EdgeConfigPanel({ edge, onUpdate, onDelete }: EdgeConfigPanelProps) {
    const data = edge.data || {};

    const handleConditionChange = (value: string) => {
        onUpdate(edge.id, { condition: value });
    };

    return (
        <div className="space-y-6">
            {/* Edge Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center backdrop-blur-sm">
                        <ArrowsDownUp size={20} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground tracking-tight">Connection</h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Flow Logic</p>
                    </div>
                </div>

                {onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => onDelete(edge.id)}
                    >
                        <Trash size={16} />
                    </Button>
                )}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

            <div className="space-y-5">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Execution Condition</Label>
                    <Select
                        value={(data.condition as string) || 'always'}
                        onValueChange={handleConditionChange}
                    >
                        <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9">
                            <SelectValue placeholder="Select condition..." />
                        </SelectTrigger>
                        <SelectContent className="glass-dropdown">
                            <SelectItem value="always">Run Always (Default)</SelectItem>
                            <SelectItem value="booked">If Call Booked</SelectItem>
                            <SelectItem value="not_booked">If Call Not Booked</SelectItem>
                            <SelectItem value="success">If Evaluation Success</SelectItem>
                            <SelectItem value="failed">If Evaluation Failed</SelectItem>
                            <SelectItem value="custom">Custom Variable Condition</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                        <Info size={10} />
                        Determines if the next node should execute.
                    </p>
                </div>

                {data.condition === 'custom' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Custom Condition</Label>
                        <Input
                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                            value={(data.custom_condition as string) || ''}
                            onChange={(e) => onUpdate(edge.id, { custom_condition: e.target.value })}
                            placeholder="e.g. {status} == 'active'"
                        />
                    </div>
                )}
            </div>

            <div className="pt-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Pro Tip</h4>
                    <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                        Conditions allow you to create branching logic. For example, send an SMS only if a call was successfully booked.
                    </p>
                </div>
            </div>
        </div>
    );
}
