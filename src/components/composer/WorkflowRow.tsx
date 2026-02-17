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
            className="cursor-pointer hover:bg-muted/20 transition-colors border-b border-border/30"
            onClick={onClick}
        >
            {/* Checkbox */}
            <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                <Checkbox className="border-muted-foreground/40" />
            </TableCell>

            {/* Name */}
            <TableCell>
                <span className="text-sm font-medium text-foreground">{workflow.name}</span>
            </TableCell>

            {/* Steps - integration icons */}
            <TableCell>
                <div className="flex items-center gap-1.5">
                    {stepIcons.length > 0 ? (
                        stepIcons.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <div
                                    key={index}
                                    className={`w-6 h-6 rounded-full ${step.bg} flex items-center justify-center`}
                                >
                                    <Icon size={12} weight="fill" className={step.color} />
                                </div>
                            );
                        })
                    ) : (
                        <span className="text-[11px] text-muted-foreground/50">0 steps</span>
                    )}
                    {remainingSteps > 0 && (
                        <span className="text-xs text-muted-foreground ml-0.5">+{remainingSteps}</span>
                    )}
                </div>
            </TableCell>

            {/* Location (Folder) */}
            <TableCell>
                <span className="text-sm text-muted-foreground">
                    {isAgency
                        ? (workflow.account_name || "Internal")
                        : (workflow.folder_name || "Uncategorized")
                    }
                </span>
            </TableCell>

            {/* Last modified */}
            <TableCell>
                <span className="text-sm text-muted-foreground">
                    {format(new Date(workflow.updated_at), "MMM d, yyyy, h:mm a")}
                </span>
            </TableCell>

            {/* Status - toggle switch */}
            <TableCell onClick={(e) => e.stopPropagation()}>
                <Switch
                    checked={workflow.is_active}
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
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 hover:opacity-100 transition-opacity">
                            <DotsThreeVertical size={16} weight="bold" />
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
