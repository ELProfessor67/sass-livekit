import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import React from "react";

interface WorkflowStatusBadgeProps {
    status: 'draft' | 'active' | 'paused';
}

const statusStyles = {
    draft: "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/10",
    active: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10",
    paused: "bg-gray-500/10 text-gray-600 border-gray-500/20 hover:bg-gray-500/10"
};

const statusLabels = {
    draft: "Draft",
    active: "Active",
    paused: "Paused"
};

export function WorkflowStatusBadge({ status }: WorkflowStatusBadgeProps) {
    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs font-medium px-2.5 py-0.5",
                statusStyles[status]
            )}
        >
            {statusLabels[status]}
        </Badge>
    );
}
