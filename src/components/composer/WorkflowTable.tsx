import { ThemeCard } from "@/components/theme/ThemeCard";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkflowRow } from "./WorkflowRow";
import { Workflow } from "@/hooks/useWorkflows";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";

interface WorkflowTableProps {
    workflows: Workflow[];
    isLoading: boolean;
    onWorkflowClick: (workflowId: string) => void;
}

export function WorkflowTable({ workflows, isLoading, onWorkflowClick }: WorkflowTableProps) {
    if (isLoading) {
        return (
            <ThemeCard variant="glass">
                <div className="p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            </ThemeCard>
        );
    }

    if (!workflows || workflows.length === 0) {
        return (
            <ThemeCard variant="glass">
                <div className="p-12 text-center">
                    <p className="text-muted-foreground text-sm">No workflows found in this section</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                        Try adjusting your filters or create a new workflow
                    </p>
                </div>
            </ThemeCard>
        );
    }

    return (
        <ThemeCard variant="glass" className="overflow-hidden border-white/[0.05] bg-white/[0.01]">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-white/[0.05]">
                        <TableHead className="w-12">
                            <Checkbox className="border-muted-foreground/40" />
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Name</TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Steps</TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Location</TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Updated</TableHead>
                        <TableHead className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] w-24 text-center">Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {workflows.map(workflow => (
                        <WorkflowRow
                            key={workflow.id}
                            workflow={workflow}
                            onClick={() => onWorkflowClick(workflow.id)}
                        />
                    ))}
                </TableBody>
            </Table>
        </ThemeCard>
    );
}
