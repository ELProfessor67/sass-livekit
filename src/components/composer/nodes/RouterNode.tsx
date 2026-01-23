import { memo, useEffect } from 'react';
import { NodeProps, Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { BaseNode, BaseNodeData } from './BaseNode';
import { getIntegrationIcon } from '../data/integrationActions';
import { cn } from '@/lib/utils';
import { GitBranch, MoreVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RouterBranch {
    id: string;
    label: string;
    condition: {
        variable: string;
        operator: string;
        value: string;
    };
    nextNodeId?: string;
}

export interface RouterNodeData extends BaseNodeData {
    branches?: RouterBranch[];
    branchChildren?: Record<string, boolean>;
}

export const RouterNode = memo((props: NodeProps<any>) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const nodeData: RouterNodeData = {
        ...props.data,
        icon: <GitBranch size={16} className="text-indigo-500" />,
        iconBgClass: "bg-indigo-500/10 border border-indigo-500/20",
        type: 'Router',
        branches: props.data.branches || [],
    };

    const branches = nodeData.branches || [];

    // Notify React Flow when branches or their children change so handles are re-measured
    useEffect(() => {
        updateNodeInternals(props.id);
    }, [props.id, branches.length, props.data.branchChildren, updateNodeInternals]);

    const handleAddToBranch = (e: React.MouseEvent, branchIdx: number) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('composer-open-add-menu', {
            detail: {
                nodeId: props.id,
                branchHandle: `branch-${branchIdx}`
            }
        }));
    };

    return (
        <div className="relative w-[280px] z-10" style={{ minHeight: branches.length > 0 ? '380px' : 'auto' }}>
            {/* Main Router Node */}
            <div
                className={cn(
                    "group node-drag-handle relative w-[280px] rounded-[var(--radius-xl)] border-2 backdrop-blur-2xl bg-card shadow-2xl transition-all cursor-move z-10",
                    props.selected ? "border-indigo-500 shadow-indigo-500/20 scale-[1.02]" : "border-white/10 hover:border-white/20",
                    "hover:shadow-3xl"
                )}
            >
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-background"
                />

                <div className="p-4 space-y-3">
                    {/* Node Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">

                            <div className={cn(
                                "w-8 h-8 rounded-md flex items-center justify-center backdrop-blur-sm",
                                nodeData.iconBgClass || "bg-indigo-500/20 border border-indigo-500/20"
                            )}>
                                {nodeData.icon}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-foreground">{nodeData.label || 'Router'}</div>
                                <div className="text-xs text-muted-foreground">Router</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Branching UI Section */}
            {branches.length > 0 && (
                <div
                    className="absolute top-[84px] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
                    style={{ width: `${branches.length * 350}px` }}
                >
                    {/* Vertical line from Router center to horizontal bar */}
                    <div className="w-[3px] h-[20px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />

                    {/* Horizontal Bar - Spans between centers of outermost branches */}
                    {branches.length > 1 && (
                        <div
                            className="h-[3px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                            style={{ width: `${(branches.length - 1) * 350}px` }}
                        />
                    )}

                    {/* Branches Container */}
                    <div className="flex justify-center w-full">
                        {branches.map((branch, idx) => {
                            const colorScheme = {
                                bg: 'bg-[#1a1a1a]',
                                border: 'border-white/20',
                                text: 'text-white',
                                hover: 'hover:border-white/40',
                                handle: '!bg-primary'
                            };

                            // Check if this specific branch has a child connection
                            const branchHandleId = `branch-${idx}`;
                            const hasChild = props.data.branchChildren?.[branchHandleId] || false;

                            return (
                                <div key={branch.id || idx} className="w-[350px] flex flex-col items-center flex-shrink-0 relative">
                                    {/* Line from horizontal bar to branch oval */}
                                    <div className="w-[3px] h-[30px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />

                                    {/* Branch Node Oval */}
                                    <div
                                        className={cn(
                                            "relative node-drag-handle rounded-full border-2 backdrop-blur-xl transition-all cursor-move min-w-[120px] px-4 py-2.5 flex items-center justify-center z-30",
                                            colorScheme.bg,
                                            colorScheme.border,
                                            colorScheme.hover,
                                            props.selected && "scale-[1.02]"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-bold whitespace-nowrap", colorScheme.text)}>
                                                {branch.label || `Branch ${idx + 1}`}
                                            </span>
                                            <MoreVertical size={12} className={cn("opacity-40 flex-shrink-0", colorScheme.text)} />
                                        </div>

                                        <Handle
                                            type="source"
                                            position={Position.Bottom}
                                            id={branchHandleId}
                                            className={cn("!w-3 !h-3 !border-2 !border-background !bottom-[-6px]", colorScheme.handle)}
                                            style={{ left: '50%', transform: 'translateX(-50%)' }}
                                        />
                                    </div>

                                    {/* Line below branch to Add button */}
                                    <div className="w-[3px] h-[40px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />

                                    {/* Add Button - Only show if branch doesn't have a child already */}
                                    {!hasChild && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => handleAddToBranch(e, idx)}
                                            className={cn(
                                                "h-10 w-10 rounded-xl nodrag z-30",
                                                "bg-[#1a1a1a] border border-white/10 shadow-xl hover:border-white/30 hover:bg-[#252525] transition-all",
                                                "flex items-center justify-center group/addbtn"
                                            )}
                                        >
                                            <Plus className="h-5 w-5 text-white/50 group-hover/addbtn:text-white transition-colors" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});

RouterNode.displayName = 'RouterNode';
