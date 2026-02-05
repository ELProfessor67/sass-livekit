import { TableCell, TableRow } from "@/components/ui/table";
import { Workflow } from "@/hooks/useWorkflows";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    DotsThreeVertical,
    Copy,
    PencilSimple,
    Archive,
    Trash,
    Lightning,
    EnvelopeSimple,
    CalendarCheck,
    ChatCircle,
    FolderSimple,
    Globe
} from "phosphor-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { SourceIndicator } from "./SourceBadge";
import { useAccountRoleContext } from "@/hooks/useAccountRole";
import { useWorkflows } from "@/hooks/useWorkflows";
import React from "react";

interface WorkflowRowProps {
    workflow: Workflow;
    onClick: () => void;
}

// Helper to get step icons based on workflow nodes
function getStepIcons(nodes: any[]) {
    const iconMap: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
        trigger: { icon: Lightning, color: "text-amber-500", bg: "bg-amber-500/10" },
        action: { icon: EnvelopeSimple, color: "text-blue-500", bg: "bg-blue-500/10" },
        condition: { icon: Lightning, color: "text-purple-500", bg: "bg-purple-500/10" }, // Generic for now
        delay: { icon: Lightning, color: "text-slate-400", bg: "bg-slate-400/10" },
    };

    if (!nodes || nodes.length === 0) return [];

    // Get first 3 different node types to show as indicators
    const uniqueTypes = Array.from(new Set(nodes.map(n => n.type))).slice(0, 3);

    return uniqueTypes.map(type => {
        const config = iconMap[type as string] || iconMap.trigger;
        return { type, ...config };
    });
}

export function WorkflowRow({ workflow, onClick }: WorkflowRowProps) {
    const { isAgency } = useAccountRoleContext();
    const { updateWorkflow, deleteWorkflow } = useWorkflows();
    const stepIcons = getStepIcons(workflow.nodes);
    const remainingSteps = Math.max(0, workflow.nodes.length - 3);

    return (
        <TableRow
            className="group cursor-pointer hover:bg-white/[0.04] transition-all duration-300 border-b border-white/[0.05] last:border-0"
            onClick={onClick}
        >
            {/* Checkbox */}
            <TableCell className="w-12 py-4" onClick={(e) => e.stopPropagation()}>
                <Checkbox className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
            </TableCell>

            {/* Name & Source */}
            <TableCell className="py-4">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{workflow.name}</span>
                        <SourceIndicator sourceType={workflow.source_type} className="scale-75 origin-left" />
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[280px]">
                        {workflow.description || "No description provided"}
                    </span>
                </div>
            </TableCell>

            {/* Steps - integration icons */}
            <TableCell className="py-4">
                <div className="flex items-center gap-1.5">
                    {stepIcons.length > 0 ? (
                        stepIcons.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <div
                                    key={index}
                                    className={`w-6 h-6 rounded-md ${step.bg} flex items-center justify-center border border-white/5`}
                                    title={step.type as string}
                                >
                                    <Icon size={12} weight="fill" className={step.color} />
                                </div>
                            );
                        })
                    ) : (
                        <span className="text-[11px] text-muted-foreground/50">0 steps</span>
                    )}
                    {remainingSteps > 0 && (
                        <span className="text-[10px] text-muted-foreground font-medium ml-0.5">+{remainingSteps}</span>
                    )}
                </div>
            </TableCell>

            {/* Location (Folder or Client) */}
            <TableCell className="py-4">
                <div className="flex items-center gap-2">
                    {isAgency ? (
                        <>
                            <Globe size={14} className="text-blue-500/60" />
                            <span className="text-xs text-muted-foreground font-medium">{workflow.account_name || "Internal"}</span>
                        </>
                    ) : (
                        <>
                            <FolderSimple size={14} className="text-primary/60" />
                            <span className="text-xs text-muted-foreground font-medium">{workflow.folder_name || "All Flows"}</span>
                        </>
                    )}
                </div>
            </TableCell>

            {/* Last modified */}
            <TableCell className="py-4">
                <span className="text-xs text-muted-foreground tabular-nums">
                    {format(new Date(workflow.updated_at), "MMM d, yyyy")}
                </span>
            </TableCell>

            {/* Status - toggle switch */}
            <TableCell className="py-4 text-center" onClick={(e) => e.stopPropagation()}>
                <Switch
                    checked={workflow.is_active}
                    className="scale-75 data-[state=checked]:bg-green-500"
                    onCheckedChange={(checked) => {
                        updateWorkflow.mutate({
                            id: workflow.id,
                            is_active: checked,
                            status: checked ? 'active' : 'paused'
                        });
                    }}
                    disabled={updateWorkflow.isPending}
                />
            </TableCell>

            {/* Actions */}
            <TableCell className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DotsThreeVertical size={18} weight="bold" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 glass-dropdown">
                        <DropdownMenuItem className="gap-2">
                            <PencilSimple size={15} weight="duotone" />
                            <span>Edit Workflow</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                            <Copy size={15} weight="duotone" />
                            <span>Duplicate</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                            <Archive size={15} weight="duotone" />
                            <span>Archive</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-2 text-destructive focus:bg-destructive/10"
                            onClick={() => deleteWorkflow.mutate(workflow.id)}
                        >
                            <Trash size={15} weight="duotone" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}
