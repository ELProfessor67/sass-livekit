import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BaseNodeData {
    label: string;
    type?: string;
    configured?: boolean;
    icon?: React.ReactNode;
    iconBgClass?: string;
    stepNumber?: number;
    hasChild?: boolean;
}

export const BaseNode = memo(({ data, selected, id, type }: NodeProps<any>) => {
    const nodeData = data as BaseNodeData;

    const handleAddClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('composer-open-add-menu', { detail: { nodeId: id } }));
    };

    const isBranchingNode = type === 'router' || type === 'condition';

    return (
        <div
            className={cn(
                "group node-drag-handle relative min-w-[280px] rounded-[var(--radius-xl)] border-2 backdrop-blur-2xl bg-card shadow-2xl transition-all cursor-move",
                selected ? "border-primary shadow-primary/20 scale-[1.02]" : "border-white/10 hover:border-white/20",
                "hover:shadow-3xl"
            )}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-primary !border-2 !border-background"
            />

            <div className="p-4 space-y-3">
                {/* Node Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Step Number Badge */}

                        <div className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center backdrop-blur-sm",
                            nodeData.iconBgClass || "bg-primary/20 dark:bg-primary/30 border border-primary/20"
                        )}>
                            {nodeData.icon}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-foreground">{nodeData.label}</div>
                            <div className="text-xs text-muted-foreground">{nodeData.type || 'Node'}</div>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 nodrag">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-dropdown">
                            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('composer-edit-node', { detail: { nodeId: id } }))}>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('composer-duplicate-node', { detail: { nodeId: id } }))}>
                                Duplicate
                            </DropdownMenuItem>
                            {id !== '1' && (
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    onClick={() => window.dispatchEvent(new CustomEvent('composer-delete-node', { detail: { nodeId: id } }))}
                                >
                                    Delete
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Node Status/Info */}
                {nodeData.configured && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>Configured</span>
                    </div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-primary !border-2 !border-background"
            />

            {/* Add Action Button - Only show if not branching and doesn't have a child already */}
            {!isBranchingNode && !nodeData.hasChild && (
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleAddClick}
                    className={cn(
                        "absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full nodrag",
                        "backdrop-blur-xl bg-background/90 border border-white/15",
                        "shadow-sm hover:shadow transition-all",
                        "opacity-0 group-hover:opacity-100"
                    )}
                >
                    <Plus className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
});

BaseNode.displayName = 'BaseNode';
