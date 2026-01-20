import { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
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
}

export const RouterNode = memo((props: NodeProps<RouterNodeData>) => {
    const nodeData: RouterNodeData = {
        ...props.data,
        icon: <GitBranch size={16} className="text-indigo-500" />,
        iconBgClass: "bg-indigo-500/10 border border-indigo-500/20",
        type: 'Router',
        branches: props.data.branches || [],
    };

    const branches = nodeData.branches || [];

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
        <div className="relative w-full z-10" style={{ minHeight: branches.length > 0 ? '280px' : 'auto' }}>
            {/* Main Router Node */}
            <div
                className={cn(
                    "group node-drag-handle relative min-w-[280px] rounded-[var(--radius-xl)] border-2 backdrop-blur-2xl bg-card shadow-2xl transition-all cursor-move z-10",
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
                            {nodeData.stepNumber && (
                                <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-500">
                                    {nodeData.stepNumber}
                                </div>
                            )}
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

            {/* Branch Nodes - Displayed below router */}
            {branches.length > 0 && (
                <div className="relative mt-8 z-20">
                    {/* Connection line from router center down */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-indigo-500/30 to-indigo-500/20 z-20" />
                    
                    {/* Horizontal line connecting all branches */}
                    <div className="absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent z-20" />

                    {/* Branches container */}
                    <div 
                        className="relative flex items-start justify-center gap-4 pt-8 z-20"
                        style={{ minWidth: '100%' }}
                    >
                        {branches.map((branch, idx) => {
                            const isDefault = branch.label?.toLowerCase() === 'otherwise' || branch.label?.toLowerCase() === 'default';
                            
                            // Color scheme for branches - cycle through different colors
                            const branchColors = [
                                { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500', hover: 'hover:border-blue-500/40', handle: '!bg-blue-500', gradient: 'from-blue-500/20' },
                                { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500', hover: 'hover:border-amber-500/40', handle: '!bg-amber-500', gradient: 'from-amber-500/20' },
                                { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500', hover: 'hover:border-purple-500/40', handle: '!bg-purple-500', gradient: 'from-purple-500/20' },
                                { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-500', hover: 'hover:border-teal-500/40', handle: '!bg-teal-500', gradient: 'from-teal-500/20' },
                                { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-500', hover: 'hover:border-pink-500/40', handle: '!bg-pink-500', gradient: 'from-pink-500/20' },
                            ];
                            
                            const colorScheme = isDefault 
                                ? { bg: 'bg-card', border: 'border-white/20', text: 'text-foreground/80', hover: 'hover:border-white/30', handle: '!bg-gray-500', gradient: 'from-gray-500/20' }
                                : branchColors[idx % branchColors.length];
                            
                            return (
                                <div key={branch.id || idx} className="relative flex flex-col items-center group/branch z-20">
                                    {/* Connection line from horizontal line to branch */}
                                    <div className={cn(
                                        "absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b to-transparent z-20",
                                        colorScheme.gradient
                                    )} />
                                    
                                    {/* Branch Node (Oval shape) */}
                                    <div
                                        className={cn(
                                            "relative node-drag-handle rounded-full border-2 backdrop-blur-xl transition-all cursor-move min-w-[120px] px-4 py-2.5 flex items-center justify-center z-20",
                                            colorScheme.bg,
                                            colorScheme.border,
                                            colorScheme.hover,
                                            props.selected && "scale-[1.02]"
                                        )}
                                    >
                                        {/* Branch Label */}
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-xs font-medium whitespace-nowrap",
                                                colorScheme.text
                                            )}>
                                                {branch.label || `Branch ${idx + 1}`}
                                            </span>
                                            <MoreVertical 
                                                size={12} 
                                                className={cn(
                                                    "opacity-40 flex-shrink-0",
                                                    colorScheme.text
                                                )} 
                                            />
                                        </div>

                                        {/* Source Handle for this branch */}
                                        <Handle
                                            type="source"
                                            position={Position.Bottom}
                                            id={`branch-${idx}`}
                                            className={cn(
                                                "!w-3 !h-3 !border-2 !border-background !bottom-[-6px]",
                                                colorScheme.handle
                                            )}
                                            style={{ left: '50%', transform: 'translateX(-50%)' }}
                                        />
                                    </div>

                                    {/* Add Node Button below branch */}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => handleAddToBranch(e, idx)}
                                        className={cn(
                                            "absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full nodrag z-10",
                                            "backdrop-blur-xl bg-background/90 border border-white/15",
                                            "shadow-sm hover:shadow transition-all",
                                            "opacity-0 group-hover/branch:opacity-100"
                                        )}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
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
