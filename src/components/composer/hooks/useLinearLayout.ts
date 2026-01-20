import { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;
const START_X = 400;  // Center horizontally
const START_Y = 20; // Start at the very top
const VERTICAL_GAP = 140; // Tighter vertical spacing
const HORIZONTAL_GAP = 0; // No horizontal gap - pure vertical layout
const BRANCH_OFFSET = 100; // Small offset for branch nodes

/**
 * Calculate vertical linear layout for nodes based on edges
 * Uses BFS to traverse the graph and position nodes in a single vertical column
 */
function calculateHierarchicalLayout<T extends Record<string, any>>(
    nodes: Node<T>[],
    edges: Edge[]
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    
    if (nodes.length === 0) return positions;

    // Build adjacency lists
    const incomingEdges = new Map<string, Edge[]>();
    const outgoingEdges = new Map<string, Edge[]>();
    
    edges.forEach(edge => {
        if (!incomingEdges.has(edge.target)) {
            incomingEdges.set(edge.target, []);
        }
        incomingEdges.get(edge.target)!.push(edge);
        
        if (!outgoingEdges.has(edge.source)) {
            outgoingEdges.set(edge.source, []);
        }
        outgoingEdges.get(edge.source)!.push(edge);
    });

    // Find root nodes (nodes with no incoming edges, or trigger nodes)
    const rootNodes = nodes.filter(node => {
        const isTrigger = node.type === 'trigger';
        const hasNoIncoming = !incomingEdges.has(node.id) || incomingEdges.get(node.id)!.length === 0;
        return isTrigger || hasNoIncoming;
    });

    if (rootNodes.length === 0) {
        // Fallback: use first node as root
        rootNodes.push(nodes[0]);
    }

    // BFS traversal to get ordered list of nodes (vertical order)
    const orderedNodes: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [];

    rootNodes.forEach(root => {
        queue.push(root.id);
        visited.add(root.id);
    });

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        orderedNodes.push(nodeId);
        
        const children = outgoingEdges.get(nodeId) || [];
        
        // Sort children to maintain consistent ordering
        children.sort((a, b) => {
            // If there's a sourceHandle (branch), use it for ordering
            if (a.sourceHandle && b.sourceHandle) {
                return a.sourceHandle.localeCompare(b.sourceHandle);
            }
            return a.target.localeCompare(b.target);
        });

        children.forEach(edge => {
            if (!visited.has(edge.target)) {
                visited.add(edge.target);
                queue.push(edge.target);
            }
        });
    }

    // Handle isolated nodes (nodes not in the graph)
    const isolatedNodes = nodes.filter(node => !visited.has(node.id));
    isolatedNodes.forEach(node => {
        orderedNodes.push(node.id);
    });

    // Build map of which nodes are connected to which router branches
    const branchConnections = new Map<string, { routerId: string; branchHandle: string; branchIndex: number }>();
    edges.forEach(edge => {
        if (edge.sourceHandle && edge.sourceHandle.startsWith('branch-')) {
            const branchIndex = parseInt(edge.sourceHandle.replace('branch-', ''), 10);
            branchConnections.set(edge.target, {
                routerId: edge.source,
                branchHandle: edge.sourceHandle,
                branchIndex: branchIndex
            });
        }
    });
    
    // Calculate branch positions for each router
    const routerBranchPositions = new Map<string, Map<number, number>>(); // routerId -> branchIndex -> x position
    nodes.forEach(node => {
        if (node.type === 'router' && node.data?.branches && Array.isArray(node.data.branches) && node.data.branches.length > 0) {
            const branches = node.data.branches;
            const branchPositions = new Map<number, number>();
            const branchGap = 320; // Horizontal gap between branches
            const totalWidth = (branches.length - 1) * branchGap;
            const startX = START_X - totalWidth / 2;
            
            branches.forEach((_, idx) => {
                branchPositions.set(idx, startX + idx * branchGap);
            });
            
            routerBranchPositions.set(node.id, branchPositions);
        }
    });
    
    // Track the bottom Y position for each branch path separately
    // Key: `${routerId}-${branchIndex}` -> Y position
    const branchPathBottomY = new Map<string, number>();
    
    // Track which branch path each node belongs to (for nodes downstream of branch connections)
    // Key: nodeId -> { routerId, branchIndex, branchX }
    const nodeBranchPath = new Map<string, { routerId: string; branchIndex: number; branchX: number }>();
    
    // Calculate positions
    let currentY = START_Y;
    
    orderedNodes.forEach((nodeId, index) => {
        const node = nodes.find(n => n.id === nodeId);
        
        // Check if this node is connected to a branch
        const branchConnection = branchConnections.get(nodeId);
        
        if (branchConnection) {
            // This node is connected to a branch - position it below the branch UI, aligned with that branch
            const routerId = branchConnection.routerId;
            const branchIndex = branchConnection.branchIndex;
            const routerY = positions.get(routerId);
            
            if (routerY) {
                const routerNode = nodes.find(n => n.id === routerId);
                const routerHasBranches = routerNode?.type === 'router' && 
                    routerNode?.data?.branches && 
                    Array.isArray(routerNode.data.branches) && 
                    routerNode.data.branches.length > 0;
                
                if (routerHasBranches) {
                    // Get the X position for this specific branch
                    const branchXPositions = routerBranchPositions.get(routerId);
                    const branchX = branchXPositions?.get(branchIndex) || START_X;
                    
                    // Calculate branch UI bottom position
                    // Router node height (~120px) + branch UI space (~280px) = ~400px total
                    const branchBottomY = routerY.y + NODE_HEIGHT + 280;
                    
                    // Get the Y position for this specific branch path
                    const branchPathKey = `${routerId}-${branchIndex}`;
                    const existingBottomY = branchPathBottomY.get(branchPathKey);
                    const startY = existingBottomY || branchBottomY;
                    
                    // Position this node below branch UI (or below previous node in this branch path)
                    const targetY = startY + 60; // 60px spacing below branch UI or previous node
                    
                    positions.set(nodeId, {
                        x: branchX, // Align with the branch horizontally
                        y: targetY
                    });
                    
                    // Track this node's branch path for downstream nodes
                    nodeBranchPath.set(nodeId, { routerId, branchIndex, branchX });
                    
                    // Update the bottom Y for this specific branch path
                    branchPathBottomY.set(branchPathKey, targetY + NODE_HEIGHT);
                    
                    // Update currentY to be after the deepest branch path
                    currentY = Math.max(currentY, targetY + NODE_HEIGHT + VERTICAL_GAP);
                } else {
                    // Router doesn't have branches, position normally
                    positions.set(nodeId, {
                        x: START_X,
                        y: currentY
                    });
                    currentY += NODE_HEIGHT + VERTICAL_GAP;
                }
            } else {
                // Router not positioned yet, position normally (shouldn't happen in BFS)
                positions.set(nodeId, {
                    x: START_X,
                    y: currentY
                });
                currentY += NODE_HEIGHT + VERTICAL_GAP;
            }
        } else {
            // Check if this node is connected to a node that's in a branch path
            const incomingEdge = incomingEdges.get(nodeId)?.[0];
            let positionedInBranch = false;
            
            if (incomingEdge) {
                const sourceBranchPath = nodeBranchPath.get(incomingEdge.source);
                if (sourceBranchPath) {
                    // This node is downstream of a branch-connected node - keep it in the same branch column
                    const branchPathKey = `${sourceBranchPath.routerId}-${sourceBranchPath.branchIndex}`;
                    const existingBottomY = branchPathBottomY.get(branchPathKey);
                    
                    if (existingBottomY !== undefined) {
                        const targetY = existingBottomY + VERTICAL_GAP;
                        
                        positions.set(nodeId, {
                            x: sourceBranchPath.branchX, // Keep same X as parent branch
                            y: targetY
                        });
                        
                        // Track this node's branch path
                        nodeBranchPath.set(nodeId, sourceBranchPath);
                        
                        // Update the bottom Y for this branch path
                        branchPathBottomY.set(branchPathKey, targetY + NODE_HEIGHT);
                        
                        // Update currentY
                        currentY = Math.max(currentY, targetY + NODE_HEIGHT + VERTICAL_GAP);
                        
                        positionedInBranch = true;
                    }
                }
            }
            
            if (!positionedInBranch) {
                // Normal node positioning - center horizontally
                positions.set(nodeId, {
                    x: START_X,
                    y: currentY
                });
                
                // Add extra spacing after Router nodes with branches to prevent overlap
                const isRouterWithBranches = node?.type === 'router' && 
                    node?.data?.branches && 
                    Array.isArray(node.data.branches) && 
                    node.data.branches.length > 0;
                
                if (isRouterWithBranches) {
                    // Router node height (~120px) + branch UI space (~280px) = ~400px total
                    // Add extra gap to ensure branches are visible
                    currentY += NODE_HEIGHT + 280; // Branch UI height
                } else {
                    currentY += NODE_HEIGHT + VERTICAL_GAP;
                }
            }
        }
    });

    return positions;
}

/**
 * Hook that enforces a structured hierarchical layout for workflow nodes
 * In structured mode: auto-layouts nodes in a flowchart pattern, disables dragging
 * In free mode: allows manual positioning and dragging
 */
export function useLinearLayout<T extends Record<string, any>>(
    nodes: Node<T>[],
    edges: Edge[],
    isStructured: boolean = true
): Node<T>[] {
    return useMemo(() => {
        if (!isStructured) {
            // Free mode: allow dragging, preserve positions
            return nodes.map((node, index) => ({
                ...node,
                draggable: true,
                data: {
                    ...node.data,
                    stepNumber: node.data?.stepNumber || index + 1,
                },
            }));
        }

        // Structured mode: calculate hierarchical layout
        const positions = calculateHierarchicalLayout(nodes, edges);
        
        // Calculate step numbers based on level and order
        const stepNumbers = new Map<string, number>();
        let stepCounter = 1;
        
        // Sort nodes by level, then by position
        const sortedNodes = [...nodes].sort((a, b) => {
            const posA = positions.get(a.id) || { x: 0, y: 0 };
            const posB = positions.get(b.id) || { x: 0, y: 0 };
            if (posA.x !== posB.x) return posA.x - posB.x;
            return posA.y - posB.y;
        });
        
        sortedNodes.forEach(node => {
            stepNumbers.set(node.id, stepCounter++);
        });

        return nodes.map((node) => {
            const calculatedPosition = positions.get(node.id);
            const stepNumber = stepNumbers.get(node.id) || 1;
            
            return {
                ...node,
                position: calculatedPosition || { x: START_X, y: START_Y },
                draggable: false, // Disable dragging in structured mode
                data: {
                    ...node.data,
                    stepNumber,
                },
            };
        });
    }, [nodes, edges, isStructured]);
}

/**
 * Get the layout constants for external use
 */
export const getLayoutConstants = () => ({
    startX: START_X,
    startY: START_Y,
    verticalGap: VERTICAL_GAP,
    horizontalGap: HORIZONTAL_GAP,
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
});
