import { useMemo } from 'react';
import { Node } from '@xyflow/react';

const NODE_WIDTH = 280;
const START_X = 0;  // Nodes at x=0, viewport will offset to center
const START_Y = 100; // Start below top
const VERTICAL_GAP = 120;

/**
 * Hook that enforces a linear vertical layout for workflow nodes
 * All nodes are positioned in a single column with consistent spacing
 * and step numbers are calculated based on position
 */
export function useLinearLayout<T extends Record<string, any>>(nodes: Node<T>[]): Node<T>[] {
    return useMemo(() => {
        return nodes.map((node, index) => ({
            ...node,
            // Only set a default position if the node doesn't have one yet
            position: node.position.x === 0 && node.position.y === 0
                ? { x: START_X, y: START_Y + (index * VERTICAL_GAP) }
                : node.position,
            draggable: true,
            data: {
                ...node.data,
                stepNumber: index + 1,
            },
        }));
    }, [nodes]);
}

/**
 * Get the layout constants for external use
 */
export const getLayoutConstants = () => ({
    startX: START_X,
    startY: START_Y,
    verticalGap: VERTICAL_GAP,
    nodeWidth: NODE_WIDTH,
});
