import { memo, useState } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    EdgeProps,
} from '@xyflow/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SmartEdgeProps extends EdgeProps {
    onAddNode?: (sourceId: string, targetId: string) => void;
}

export const SmartEdge = memo((props: SmartEdgeProps) => {
    const {
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        style = {},
        markerEnd,
        source,
        target,
        data,
    } = props;

    const onAddNode = data?.onAddNode as ((sourceId: string, targetId: string) => void) | undefined;

    const [isHovered, setIsHovered] = useState(false);

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const handleAddClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAddNode) {
            onAddNode(source, target);
        }
    };

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: 'hsl(var(--primary))',
                    strokeWidth: isHovered ? 5 : 4,
                    strokeDasharray: '1, 12',
                    strokeLinecap: 'round',
                    opacity: isHovered ? 1 : 0.8,
                    transition: 'all 0.2s ease',
                    animation: 'dash 0.8s linear infinite',
                    filter: isHovered
                        ? 'drop-shadow(0 0 12px hsl(var(--primary) / 0.8))'
                        : 'drop-shadow(0 0 4px hsl(var(--primary) / 0.3))',
                }}
            />
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan flex flex-col items-center gap-2"
                >
                    {typeof data?.condition === 'string' && data.condition !== 'always' && (
                        <div className="px-2 py-1 rounded-md bg-primary/10 border border-primary/20 backdrop-blur-md shadow-sm">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                                IF {data.condition.toUpperCase().replace('_', ' ')}
                            </span>
                        </div>
                    )}
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={handleAddClick}
                        className={cn(
                            "h-6 w-6 rounded-full",
                            "backdrop-blur-xl bg-background/80",
                            "border border-border/40",
                            "transition-all duration-200",
                            isHovered
                                ? "opacity-100 scale-110 shadow-[0_0_12px_hsl(var(--primary)/0.3)] border-primary/60"
                                : "opacity-50 scale-100"
                        )}
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
});

SmartEdge.displayName = 'SmartEdge';
