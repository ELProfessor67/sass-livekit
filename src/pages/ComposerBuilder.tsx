import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    Panel,
    getIncomers,
    getOutgoers,
    getConnectedEdges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
    CaretLeft,
    Selection,
    Lightning,
    CheckCircle,
    ArrowsOut,
    Flask,
    RocketLaunch,
    X,
    Plus,
    Export
} from 'phosphor-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ThemeCard } from '@/components/theme/ThemeCard';
import DashboardLayout from "@/layout/DashboardLayout";
import { ThemeContainer } from '@/components/theme';

// Custom components
import { TriggerNode } from '@/components/composer/nodes/TriggerNode';
import { ActionNode } from '@/components/composer/nodes/ActionNode';
import { ConditionNode } from '@/components/composer/nodes/ConditionNode';
import { TwilioNode } from '@/components/composer/nodes/TwilioNode';
import { SmartEdge } from '@/components/composer/edges/SmartEdge';
import { useLinearLayout } from '@/components/composer/hooks/useLinearLayout';
import { NodeSelectionPanel } from '@/components/composer/panels/NodeSelectionPanel';
import { NodeConfigPanel } from '@/components/composer/panels/NodeConfigPanel';
import { EdgeConfigPanel } from '@/components/composer/panels/EdgeConfigPanel';
import { WorkflowStatusBadge } from '@/components/composer/WorkflowStatusBadge';
import { useWorkflows, Workflow } from '@/hooks/useWorkflows';

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    condition: ConditionNode,
  
    twilio_sms: TwilioNode,
};

const edgeTypes = {
    smart: SmartEdge,
};

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

export default function ComposerBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { workflows, updateWorkflow } = useWorkflows();

    const workflow = useMemo(() =>
        workflows?.find(w => w.id === id) || {
            id: 'new',
            name: 'New Workflow',
            status: 'draft',
            nodes: [],
            edges: [],
            category: 'unsorted',
            source_type: 'scratch' as any,
            is_starter: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Workflow,
        [workflows, id]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [addContext, setAddContext] = useState<{ sourceId?: string; targetId?: string } | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sync state with fetched workflow
    useEffect(() => {
        if (workflow && workflow.id === id) {
            if (workflow.nodes && workflow.nodes.length > 0) {
                setNodes(workflow.nodes);
            }
            if (workflow.edges) {
                setEdges(workflow.edges);
            }
        }
    }, [workflow, id, setNodes, setEdges]);

    // Enhance edges with add-node functionality
    const enhancedEdges = useMemo(() => {
        return edges.map(edge => ({
            ...edge,
            data: {
                ...edge.data,
                onAddNode: (sourceId: string, targetId: string) => {
                    setAddContext({ sourceId, targetId });
                    setShowAddMenu(true);
                }
            }
        }));
    }, [edges]);

    // Auto-layout nodes
    const layoutNodes = useLinearLayout(nodes);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smart' }, eds)),
        [setEdges]
    );

    const onNodeClick = useCallback((_: any, node: Node) => {
        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);
    }, []);

    const onEdgeClick = useCallback((_: any, edge: Edge) => {
        setSelectedEdgeId(edge.id);
        setSelectedNodeId(null);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
    }, []);

    // Handle custom events from nodes
    useEffect(() => {
        const handleOpenAddMenu = (e: any) => {
            setAddContext({ sourceId: e.detail.nodeId });
            setShowAddMenu(true);
        };

        window.addEventListener('composer-open-add-menu', handleOpenAddMenu);
        return () => window.removeEventListener('composer-open-add-menu', handleOpenAddMenu);
    }, []);

    const handleSave = async (statusOverride?: 'active' | 'draft') => {
        if (!id) return;
        setIsSaving(true);
        try {
            await updateWorkflow.mutateAsync({
                id,
                nodes,
                edges,
                status: statusOverride || (workflow.status as any) || 'draft'
            });
        } catch (error) {
            console.error('Failed to save workflow:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNode = (nodeType: string, nodeData: any) => {
        const newNodeId = Math.random().toString(36).substring(7);
        const newNode: Node = {
            id: newNodeId,
            type: nodeType,
            position: { x: 0, y: 0 }, // Position will be handled by useLinearLayout
            data: nodeData,
        };

        setNodes((nds) => {
            if (addContext?.sourceId) {
                // Find the index of the source node
                const sourceIndex = nds.findIndex(n => n.id === addContext.sourceId);
                const newNodes = [...nds];
                newNodes.splice(sourceIndex + 1, 0, newNode);
                return newNodes;
            }
            return [...nds, newNode];
        });

        // Automatically connect if there's a source
        if (addContext?.sourceId) {
            setEdges((eds) => {
                const newEdges = [...eds];

                // If targetId is present, we are inserting between source and target
                if (addContext.targetId) {
                    // Remove the existing edge between source and target
                    const filteredEdges = newEdges.filter(e =>
                        !(e.source === addContext.sourceId && e.target === addContext.targetId)
                    );

                    filteredEdges.push({
                        id: `e-${addContext.sourceId}-${newNodeId}`,
                        source: addContext.sourceId,
                        target: newNodeId,
                        type: 'smart',
                    });

                    filteredEdges.push({
                        id: `e-${newNodeId}-${addContext.targetId}`,
                        source: newNodeId,
                        target: addContext.targetId,
                        type: 'smart',
                    });

                    return filteredEdges;
                }

                // If no targetId, we are just adding a new branch from the source
                newEdges.push({
                    id: `e-${addContext.sourceId}-${newNodeId}`,
                    source: addContext.sourceId,
                    target: newNodeId,
                    type: 'smart',
                });

                return newEdges;
            });
        }

        setShowAddMenu(false);
        setAddContext(null);
    };

    const handleDeleteNode = useCallback((nodeId: string) => {
        setNodes((nds) => {
            const index = nds.findIndex(n => n.id === nodeId);
            const newNodes = nds.filter((node) => node.id !== nodeId);
            return newNodes;
        });

        setEdges((eds) => {
            const inEdge = eds.find(e => e.target === nodeId);
            const outEdge = eds.find(e => e.source === nodeId);
            const otherEdges = eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);

            if (inEdge && outEdge) {
                // Connect pred to succ
                otherEdges.push({
                    id: `e-${inEdge.source}-${outEdge.target}`,
                    source: inEdge.source,
                    target: outEdge.target,
                    type: 'smart',
                });
            }
            return otherEdges;
        });

        setSelectedNodeId(null);
    }, [setNodes, setEdges]);

    const handleDuplicateNode = useCallback((nodeId: string) => {
        const nodeToDuplicate = nodes.find(n => n.id === nodeId);
        if (!nodeToDuplicate || nodeToDuplicate.type === 'trigger') return;

        const newNodeId = Math.random().toString(36).substring(7);
        const newNode: Node = {
            ...nodeToDuplicate,
            id: newNodeId,
            selected: false,
        };

        setNodes((nds) => {
            const index = nds.findIndex(n => n.id === nodeId);
            const newNodes = [...nds];
            newNodes.splice(index + 1, 0, newNode);
            return newNodes;
        });

        setEdges((eds) => {
            const existingOutEdge = eds.find(e => e.source === nodeId);
            const newEdges = [...eds];

            // If the duplicated node has an outgoing edge, we insert between node and its target
            if (existingOutEdge) {
                // Remove the old edge from node to its target
                const filteredEdges = newEdges.filter(e => e.id !== existingOutEdge.id);

                // Add edge from original to duplicate
                filteredEdges.push({
                    id: `e-${nodeId}-${newNodeId}`,
                    source: nodeId,
                    target: newNodeId,
                    type: 'smart',
                });

                // Add edge from duplicate to old target
                filteredEdges.push({
                    id: `e-${newNodeId}-${existingOutEdge.target}`,
                    source: newNodeId,
                    target: existingOutEdge.target,
                    type: 'smart',
                });
                return filteredEdges;
            } else {
                // Just add edge from original to duplicate
                newEdges.push({
                    id: `e-${nodeId}-${newNodeId}`,
                    source: nodeId,
                    target: newNodeId,
                    type: 'smart',
                });
                return newEdges;
            }
        });
    }, [nodes, setNodes, setEdges]);

    const handleDeleteEdge = useCallback((edgeId: string) => {
        setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
        setSelectedEdgeId(null);
    }, [setEdges]);

    // Handle custom events from nodes
    useEffect(() => {
        const handleOpenAddMenu = (e: any) => {
            setAddContext({ sourceId: e.detail.nodeId });
            setShowAddMenu(true);
        };

        const handleDeleteNodeEvent = (e: any) => {
            handleDeleteNode(e.detail.nodeId);
        };

        const handleDuplicateNodeEvent = (e: any) => {
            handleDuplicateNode(e.detail.nodeId);
        };

        const handleEditNodeEvent = (e: any) => {
            setSelectedNodeId(e.detail.nodeId);
            setSelectedEdgeId(null);
        };

        window.addEventListener('composer-open-add-menu', handleOpenAddMenu);
        window.addEventListener('composer-delete-node', handleDeleteNodeEvent);
        window.addEventListener('composer-duplicate-node', handleDuplicateNodeEvent);
        window.addEventListener('composer-edit-node', handleEditNodeEvent);

        return () => {
            window.removeEventListener('composer-open-add-menu', handleOpenAddMenu);
            window.removeEventListener('composer-delete-node', handleDeleteNodeEvent);
            window.removeEventListener('composer-duplicate-node', handleDuplicateNodeEvent);
            window.removeEventListener('composer-edit-node', handleEditNodeEvent);
        };
    }, [handleDeleteNode, handleDuplicateNode]);

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    const selectedEdge = edges.find(e => e.id === selectedEdgeId);

    return (
        <DashboardLayout>
            <div className={cn(
                "flex-1 flex flex-col transition-all duration-500 ease-in-out",
                isExpanded ? "fixed inset-0 z-[100]" : "h-[calc(100vh-64px)]"
            )}>
                {/* Top Navigation Bar - Glass Effect */}
                <header className="h-16 shrink-0 border-b border-border/10 bg-white/[0.02] backdrop-blur-xl px-6 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/workflows')}
                            className="h-8 w-8"
                        >
                            <CaretLeft size={18} weight="bold" />
                        </Button>
                        <div className="w-px h-4 bg-border/60 mx-1" />
                        <div className="flex items-center gap-3">
                            <h1 className="text-sm font-semibold tracking-tight">{workflow.name}</h1>
                            <WorkflowStatusBadge status={workflow.status as any} />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <Tabs defaultValue="editor" className="w-[320px]">
                            <TabsList className="grid w-full grid-cols-3 h-9 p-1 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                                <TabsTrigger value="editor" className="text-[10px] uppercase font-bold tracking-wider rounded-lg data-[state=active]:bg-primary shadow-lg data-[state=active]:text-white">Editor</TabsTrigger>
                                <TabsTrigger value="runs" className="text-[10px] uppercase font-bold tracking-wider rounded-lg data-[state=active]:bg-primary shadow-lg data-[state=active]:text-white">Runs</TabsTrigger>
                                <TabsTrigger value="overview" className="text-[10px] uppercase font-bold tracking-wider rounded-lg data-[state=active]:bg-primary shadow-lg data-[state=active]:text-white">Overview</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsExpanded(!isExpanded)}
                            title={isExpanded ? "Collapse" : "Expand"}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        >
                            <ArrowsOut size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-medium">
                            <Export size={14} />
                            Share
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-semibold border-primary/20 hover:bg-primary/5">
                            <Flask size={14} className="text-primary" />
                            Test
                        </Button>
                        <Button
                            size="sm"
                            className="h-8 gap-2 text-xs font-bold shadow-sm shadow-primary/20"
                            onClick={() => handleSave('active')}
                            disabled={isSaving || updateWorkflow.isPending}
                        >
                            {isSaving ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                                <RocketLaunch size={14} weight="fill" />
                            )}
                            Publish
                        </Button>
                    </div>
                </header>

                {/* Main Builder Area */}
                <div className="flex-1 flex overflow-hidden relative min-h-0">
                    {/* Canvas Area */}
                    <div className="flex-1 relative bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.03)_1px,transparent_0)] bg-[size:32px_32px] min-h-[500px]">
                        <ReactFlow
                            nodes={layoutNodes}
                            edges={enhancedEdges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onEdgeClick={onEdgeClick}
                            onPaneClick={onPaneClick}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            fitView
                            minZoom={0.2}
                            maxZoom={1.5}
                            defaultEdgeOptions={{ type: 'smart' }}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <Background color="rgba(255,255,255,0.15)" gap={32} />
                            <Controls showInteractive={false} className="glass-controls" />

                            {/* Legend / Help Panel */}
                            <Panel position="bottom-left" className="m-4">
                                <ThemeCard variant="glass" className="p-3 border-border/40 backdrop-blur-md">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-sm bg-purple-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trigger</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-sm bg-blue-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Action</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-sm bg-amber-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logic</span>
                                        </div>
                                    </div>
                                </ThemeCard>
                            </Panel>
                        </ReactFlow>

                        {nodes.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                                <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">
                                    <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/20">
                                        <Lightning size={40} weight="duotone" className="text-primary animate-pulse" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h2 className="text-xl font-bold tracking-tight text-foreground/90">Blank Canvas</h2>
                                        <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                                            Your workflow is empty. Start by adding your first node – a trigger or an initial action.
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        className="pointer-events-auto h-12 px-8 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all hover:scale-105 cursor-pointer"
                                        onClick={() => {
                                            setAddContext(null);
                                            setShowAddMenu(true);
                                        }}
                                    >
                                        <Plus size={16} className="mr-2" weight="bold" />
                                        Add First Node
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Configuration / Selection Panels - Glass UI */}
                    {(selectedNode || selectedEdge || showAddMenu) && (
                        <aside className="w-[380px] shrink-0 border-l border-white/[0.08] bg-white/[0.01] backdrop-blur-2xl z-20 flex flex-col shadow-[var(--shadow-glass-xl)] animate-in slide-in-from-right duration-500">
                            {showAddMenu ? (
                                <NodeSelectionPanel
                                    onClose={() => { setShowAddMenu(false); setAddContext(null); }}
                                    onSelect={handleAddNode}
                                />
                            ) : selectedNode ? (
                                <div className="h-full flex flex-col">
                                    <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                                            Configuring Node
                                        </h3>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedNodeId(null)}>
                                            <X size={14} />
                                        </Button>
                                    </div>
                                    <ScrollArea className="flex-1 p-6">
                                        <NodeConfigPanel
                                            node={selectedNode}
                                            onUpdate={(id, data) => {
                                                setNodes((nds) => nds.map((node) =>
                                                    node.id === id ? { ...node, data: { ...node.data, ...data } } : node
                                                ));
                                            }}
                                            onDelete={handleDeleteNode}
                                        />
                                    </ScrollArea>
                                </div>
                            ) : selectedEdge ? (
                                <div className="h-full flex flex-col">
                                    <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                                            Configuring Connection
                                        </h3>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedEdgeId(null)}>
                                            <X size={14} />
                                        </Button>
                                    </div>
                                    <ScrollArea className="flex-1 p-6">
                                        <EdgeConfigPanel
                                            edge={selectedEdge}
                                            onUpdate={(id, data) => {
                                                setEdges((eds) => eds.map((edge) =>
                                                    edge.id === id ? { ...edge, data: { ...edge.data, ...data } } : edge
                                                ));
                                            }}
                                            onDelete={handleDeleteEdge}
                                        />
                                    </ScrollArea>
                                </div>
                            ) : null}
                        </aside>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
