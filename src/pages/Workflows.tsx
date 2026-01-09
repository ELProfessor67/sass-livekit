import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Workflow,
    Trash2,
    ExternalLink,
    Globe,
    Check,
    Settings2,
    MessageSquare,
    Zap,
    ArrowRight,
    Save,
    ChevronLeft,
    PanelRightOpen,
    X,
    Phone,
    MousePointer2,
    Settings
} from "lucide-react";
import {
    ReactFlow,
    Background,
    Controls,
    Panel,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge as FlowEdge,
    Node as FlowNode,
    MarkerType,
    ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TriggerNode, TwilioSMSNode, WebhookNode, WorkflowNode } from "@/components/workflow-builder/WorkflowNodes";

const nodeTypes = {
    trigger: TriggerNode,
    twilio_sms: TwilioSMSNode,
    webhook: WebhookNode,
};
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";

interface Assistant {
    id: string;
    name: string;
}

interface Node {
    id: string;
    type: "trigger" | "webhook" | "twilio_sms";
    position: { x: number; y: number };
    data: any;
}

interface Edge {
    id: string;
    source: string;
    target: string;
}

interface WorkflowData {
    id: string;
    name: string;
    assistant_id: string | null;
    nodes: Node[];
    edges: Edge[];
    is_active: boolean;
    created_at: string;
}

const AVAILABLE_FIELDS = [
    { id: "phone_number", label: "Phone Number" },
    { id: "call_duration", label: "Call Duration" },
    { id: "call_summary", label: "Call Summary" },
    { id: "call_status", label: "Call Outcome/Status" },
    { id: "structured_data", label: "Structured Data" },
    { id: "transcription", label: "Full Transcription" },
];

export default function Workflows() {
    const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingWorkflow, setEditingWorkflow] = useState<WorkflowData | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const fetchWorkflows = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                setLoading(false);
                return;
            }

            const response = await fetch("/api/v1/workflows", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();
            if (result.success) {
                setWorkflows(result.data);
            }
        } catch (error) {
            console.error("Error fetching workflows:", error);
            toast.error("Failed to load workflows");
        } finally {
            setLoading(false);
        }
    };

    const fetchAssistants = async () => {
        try {
            const { data } = await supabase.from("assistant").select("id, name").order("name");
            if (data) setAssistants(data);
        } catch (error) {
            console.error("Error fetching assistants:", error);
        }
    };

    useEffect(() => {
        fetchWorkflows();
        fetchAssistants();
    }, []);

    // React Flow canvas handles everything now

    // Handled by React Flow

    const handleCreateNew = () => {
        const newWorkflow: WorkflowData = {
            id: "temp-" + Date.now(),
            name: "New Automation",
            assistant_id: null,
            is_active: true,
            nodes: [
                {
                    id: "trigger-1",
                    type: "trigger",
                    position: { x: 50, y: 150 },
                    data: { label: "Post-Call Analysis" }
                }
            ],
            edges: [],
            created_at: new Date().toISOString()
        };
        setEditingWorkflow(newWorkflow);
    };

    const handleSaveWorkflow = async () => {
        if (!editingWorkflow) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const isUpdate = !editingWorkflow.id.startsWith("temp-");
            const url = isUpdate ? `/api/v1/workflows/${editingWorkflow.id}` : "/api/v1/workflows";
            const method = isUpdate ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(editingWorkflow),
            });

            const result = await response.json();
            if (result.success) {
                toast.success("Workflow saved successfully");
                setEditingWorkflow(null);
                fetchWorkflows();
            } else {
                toast.error("Failed to save: " + result.message);
            }
        } catch (error) {
            toast.error("An error occurred while saving");
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this automation?")) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            await fetch(`/api/v1/workflows/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Deleted");
            fetchWorkflows();
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const addNode = (type: Node["type"]) => {
        if (!editingWorkflow) return;
        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type,
            position: { x: 400, y: 150 },
            data: type === "webhook" ? { url: "", fields: ["phone_number", "call_summary"], method: "POST" } :
                type === "twilio_sms" ? { to_number: "", message: "Call finished: {call_summary}" } : {}
        };
        setEditingWorkflow({
            ...editingWorkflow,
            nodes: [...editingWorkflow.nodes, newNode]
        });
        setNodes((nds) => [...nds, {
            id: newNode.id,
            type: newNode.type,
            position: newNode.position,
            data: newNode.data,
        }]);
        setSelectedNodeId(newNode.id);
    };

    const updateNodeData = (nodeId: string, newData: any) => {
        if (!editingWorkflow) return;
        setEditingWorkflow({
            ...editingWorkflow,
            nodes: editingWorkflow.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n)
        });
        setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node));
    };

    // React Flow State Sync
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (editingWorkflow) {
            setNodes(editingWorkflow.nodes.map(n => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data,
            })));
            setEdges(editingWorkflow.edges.map(e => ({
                ...e,
                style: { strokeWidth: 3, stroke: '#64748b' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
            })));
        }
    }, [editingWorkflow?.id]);

    const onConnect = (params: Connection) => {
        if (!editingWorkflow) return;
        if (edges.find(e => e.source === params.source && e.target === params.target)) return;
        const newEdge: Edge = {
            id: `edge-${Date.now()}`,
            source: params.source!,
            target: params.target!
        };
        setEditingWorkflow({
            ...editingWorkflow,
            edges: [...editingWorkflow.edges, newEdge]
        });
        setEdges((eds) => addEdge({
            ...params,
            id: newEdge.id,
            style: { strokeWidth: 3, stroke: '#64748b' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
            type: 'smoothstep',
        }, eds));
        toast.success("Connected", { icon: <Zap className="h-4 w-4 text-primary" />, duration: 1000 });
    };

    const handleNodesDelete = (deletedNodes: FlowNode[]) => {
        if (!editingWorkflow) return;
        const isTrigger = deletedNodes.some(n => n.type === 'trigger');
        if (isTrigger) {
            toast.error("Cannot delete the trigger node");
            // React Flow will still delete it from state, so we need to put it back or avoid deleting
            // For now, let's just refresh the state from editingWorkflow if it fails
            return;
        }

        const deletedIds = new Set(deletedNodes.map(n => n.id));
        setEditingWorkflow({
            ...editingWorkflow,
            nodes: editingWorkflow.nodes.filter(n => !deletedIds.has(n.id)),
            edges: editingWorkflow.edges.filter(e => !deletedIds.has(e.source) && !deletedIds.has(e.target))
        });
    };

    const handleEdgesDelete = (deletedEdges: FlowEdge[]) => {
        if (!editingWorkflow) return;
        const deletedIds = new Set(deletedEdges.map(e => e.id));
        setEditingWorkflow({
            ...editingWorkflow,
            edges: editingWorkflow.edges.filter(e => !deletedIds.has(e.id))
        });
    };

    const onNodeDragStop = (_: any, node: FlowNode) => {
        if (!editingWorkflow) return;
        setEditingWorkflow({
            ...editingWorkflow,
            nodes: editingWorkflow.nodes.map(n => n.id === node.id ? { ...n, position: node.position } : n)
        });
    };

    // Handled by handleNodesDelete and handleEdgesDelete

    const selectedNode = useMemo(() =>
        editingWorkflow?.nodes.find(n => n.id === selectedNodeId),
        [editingWorkflow, selectedNodeId]);

    if (editingWorkflow) {
        return (
            <DashboardLayout>
                <ReactFlowProvider>
                    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#f9fafb] text-slate-900 overflow-hidden relative font-sans">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white/80 backdrop-blur-xl z-50 shrink-0 shadow-sm">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="icon" onClick={() => setEditingWorkflow(null)} className="hover:bg-slate-100 text-slate-500">
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="flex flex-col">
                                    <Input
                                        value={editingWorkflow.name}
                                        onChange={e => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                                        className="h-7 text-lg font-medium bg-transparent border-none focus-visible:ring-0 p-0 text-slate-900 placeholder:text-slate-400"
                                        placeholder="Enter workflow name..."
                                    />
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Assistant Scope:</span>
                                        <Select
                                            value={editingWorkflow.assistant_id || "all"}
                                            onValueChange={val => setEditingWorkflow({ ...editingWorkflow, assistant_id: val === "all" ? null : val })}
                                        >
                                            <SelectTrigger className="h-5 py-0 px-2 text-[10px] bg-slate-100 border-slate-200 w-32 font-medium text-slate-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 shadow-xl rounded-xl">
                                                <SelectItem value="all">All Assistants</SelectItem>
                                                {assistants.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button onClick={handleSaveWorkflow} className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 px-6 h-9 rounded-xl transition-all active:scale-95">
                                    <Save className="h-4 w-4 mr-2" /> Save Workflow
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-1 overflow-hidden relative">
                            {/* Sidebar: Node Palette */}
                            <div className="w-64 border-r border-slate-200 bg-white p-4 flex flex-col gap-4 z-40 shrink-0 shadow-[1px_0_5px_rgba(0,0,0,0.02)]">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 px-1">Action Nodes</h3>
                                <Button
                                    variant="outline"
                                    className="justify-start gap-4 bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs font-medium py-7 px-4 rounded-2xl group transition-all shadow-sm"
                                    onClick={() => addNode("twilio_sms")}
                                >
                                    <div className="p-2.5 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform"><MessageSquare className="h-4 w-4 text-blue-600" /></div>
                                    <span className="text-slate-700 font-semibold">Twilio SMS</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start gap-4 bg-white border-slate-200 hover:border-purple-400 hover:bg-purple-50 text-xs font-medium py-7 px-4 rounded-2xl group transition-all shadow-sm"
                                    onClick={() => addNode("webhook")}
                                >
                                    <div className="p-2.5 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform"><Globe className="h-4 w-4 text-purple-600" /></div>
                                    <span className="text-slate-700 font-semibold">Webhook</span>
                                </Button>
                            </div>

                            {/* Canvas Container */}
                            {/* React Flow Canvas */}
                            <div className="flex-1 relative bg-white overflow-hidden">
                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange}
                                    onConnect={onConnect}
                                    onNodesDelete={handleNodesDelete}
                                    onEdgesDelete={handleEdgesDelete}
                                    onNodeDragStop={onNodeDragStop}
                                    nodeTypes={nodeTypes}
                                    onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                                    onPaneClick={() => setSelectedNodeId(null)}
                                    fitView
                                    className="bg-[#f9fafb]"
                                >
                                    <Background color="#e5e7eb" gap={24} size={1} />
                                    <Controls className="bg-white border-slate-200 shadow-xl rounded-xl" />
                                    <Panel position="top-right" className="bg-white/80 backdrop-blur-xl p-2 border border-slate-200 rounded-2xl shadow-sm flex items-center gap-2">
                                        <div className="flex items-center gap-2 px-2 border-r border-slate-100 mr-1">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Editor</span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-8 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => toast.info("Zoom fit active")}>
                                            <MousePointer2 className="h-4 w-4 mr-2" /> Select
                                        </Button>
                                    </Panel>
                                </ReactFlow>
                            </div>

                            {/* Configuration Sidebar */}
                            <AnimatePresence>
                                {selectedNode && (
                                    <motion.div
                                        initial={{ x: 300, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: 300, opacity: 0 }}
                                        className="w-80 border-l border-slate-200 bg-white p-6 overflow-y-auto shrink-0 z-50 shadow-[-10px_0_30px_rgba(0,0,0,0.04)]"
                                    >
                                        <div className="flex items-center justify-between mb-10">
                                            <div className="flex flex-col gap-1">
                                                <h3 className="text-xl font-bold tracking-tight text-slate-900">Config</h3>
                                                <span className="text-[10px] text-primary uppercase tracking-[0.2em] font-black">{selectedNode.type.replace('_', ' ')}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                if (selectedNode.type === 'trigger') {
                                                    toast.error("Cannot delete the trigger node");
                                                    return;
                                                }
                                                const nodeId = selectedNode.id;
                                                setEditingWorkflow({
                                                    ...editingWorkflow,
                                                    nodes: editingWorkflow.nodes.filter(n => n.id !== nodeId),
                                                    edges: editingWorkflow.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
                                                });
                                                setSelectedNodeId(null);
                                            }} className="hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all h-10 w-10">
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </div>

                                        {selectedNode.type === "trigger" && (
                                            <div className="space-y-6">
                                                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                                        The <span className="text-slate-900 font-bold">Post-Call Trigger</span> starts your workflow as soon as an agent call finishing its analysis. No configuration needed—just connect an action node to it!
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedNode.type === "twilio_sms" && (
                                            <div className="space-y-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-black ml-1">Target Phone Number</Label>
                                                    <Input
                                                        value={selectedNode.data.to_number}
                                                        onChange={e => updateNodeData(selectedNode.id, { to_number: e.target.value })}
                                                        placeholder="e.g., +15550123456"
                                                        className="bg-slate-50 border-slate-200 rounded-2xl h-12 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-black ml-1">Message Body</Label>
                                                    <Textarea
                                                        value={selectedNode.data.message}
                                                        onChange={e => updateNodeData(selectedNode.id, { message: e.target.value })}
                                                        placeholder="Hello! A call just ended. Summary: {call_summary}"
                                                        className="bg-slate-50 border-slate-200 rounded-3xl min-h-[200px] focus:ring-primary/20 focus:border-primary transition-all resize-none font-medium py-5 px-5"
                                                    />
                                                    <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-3 font-black">Available Variables:</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['{phone_number}', '{call_summary}', '{call_status}'].map(v => (
                                                                <code key={v} className="text-[9px] px-2 py-1 bg-white text-slate-600 rounded-lg border border-slate-200 font-bold">{v}</code>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {selectedNode.type === "webhook" && (
                                            <div className="space-y-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-black ml-1">Webhook URL</Label>
                                                    <Input
                                                        value={selectedNode.data.url}
                                                        onChange={e => updateNodeData(selectedNode.id, { url: e.target.value })}
                                                        placeholder="https://hooks.make.com/..."
                                                        className="bg-slate-50 border-slate-200 rounded-2xl h-12 focus:ring-primary/20 focus:border-primary transition-all font-mono text-[10px]"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-black ml-1">HTTP Method</Label>
                                                    <Select
                                                        value={selectedNode.data.method}
                                                        onValueChange={val => updateNodeData(selectedNode.id, { method: val })}
                                                    >
                                                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-2xl h-12 font-bold text-slate-700"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-white border-slate-200 rounded-2xl">
                                                            <SelectItem value="POST">POST</SelectItem>
                                                            <SelectItem value="PUT">PUT</SelectItem>
                                                            <SelectItem value="PATCH">PATCH</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] text-slate-400 uppercase tracking-widest font-black ml-1">Payload Fields</Label>
                                                    <div className="grid grid-cols-1 gap-2 p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                                                        {AVAILABLE_FIELDS.map((field) => (
                                                            <div key={field.id} className="flex items-center space-x-3 group py-1.5 transition-all">
                                                                <Checkbox
                                                                    id={field.id}
                                                                    checked={selectedNode.data.fields.includes(field.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        const current = selectedNode.data.fields;
                                                                        updateNodeData(selectedNode.id, {
                                                                            fields: checked ? [...current, field.id] : current.filter((f: any) => f !== field.id)
                                                                        });
                                                                    }}
                                                                    className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-md"
                                                                />
                                                                <label htmlFor={field.id} className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 cursor-pointer transition-colors">
                                                                    {field.label}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </ReactFlowProvider>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <main className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-[#f8fafc] text-slate-900 overflow-hidden relative font-sans">
                <header className="px-10 py-10 border-b border-slate-200 flex items-center justify-between bg-white relative z-20 shrink-0 shadow-sm">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-primary/5 rounded-[2.5rem] border border-primary/10 shadow-[0_10px_30px_rgba(255,74,113,0.08)] group transition-all duration-700 hover:rotate-6">
                            <Workflow className="text-primary h-8 w-8 transition-transform group-hover:scale-110" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <h1 className="text-4xl font-black tracking-tight text-slate-900">Automations</h1>
                            <p className="text-slate-400 text-[10px] font-bold tracking-[0.4em] uppercase ml-1">Advanced Workflow Ecosystem</p>
                        </div>
                    </div>
                    <Button onClick={handleCreateNew} className="bg-slate-900 hover:bg-slate-800 text-white px-10 h-14 rounded-3xl font-bold shadow-xl shadow-slate-200 transition-all active:scale-95">
                        <Plus className="mr-2 h-5 w-5" /> New Automation
                    </Button>
                </header>

                <div className="flex-1 overflow-auto p-10 relative z-10 scrollbar-hide">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-[300px] bg-white rounded-[3rem] animate-pulse border border-slate-100 shadow-sm"></div>
                            ))}
                        </div>
                    ) : workflows.length === 0 ? (
                        <div className="h-[600px] flex flex-col items-center justify-center text-center bg-white rounded-[4rem] border border-slate-100 shadow-xl shadow-slate-100/50 animate-in fade-in zoom-in duration-1000 px-10">
                            <div className="w-28 h-28 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mb-10 transition-all hover:bg-primary/10 hover:shadow-[0_20px_50px_rgba(255,74,113,0.12)] duration-700 group">
                                <Zap className="text-primary w-14 h-14 group-hover:rotate-12 transition-transform" />
                            </div>
                            <h3 className="text-4xl font-black tracking-tight mb-5 text-slate-900">Orchestrate your Data</h3>
                            <p className="text-slate-500 font-medium max-w-md mb-12 leading-relaxed text-lg">
                                Create powerful visual workflows that bridge your AI assistant to your entire tech stack—from SMS to CRMs.
                            </p>
                            <Button
                                onClick={handleCreateNew}
                                className="bg-primary hover:bg-primary/90 text-white px-12 h-16 rounded-[2rem] font-bold shadow-2xl shadow-primary/20 transition-all active:scale-95"
                            >
                                <Plus className="mr-3 h-6 w-6" /> Start Building
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                            {workflows.map((workflow) => (
                                <Card
                                    key={workflow.id}
                                    className="bg-white hover:bg-slate-50 border-slate-100 hover:border-primary/30 transition-all duration-700 group cursor-pointer overflow-hidden rounded-[3rem] group relative shadow-sm hover:shadow-xl hover:shadow-slate-200/50"
                                    onClick={() => setEditingWorkflow(workflow)}
                                >
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-primary/10 transition-all duration-1000"></div>

                                    <CardHeader className="relative z-10 p-8 pb-4">
                                        <div className="flex justify-between items-start">
                                            <div className="p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500 shadow-inner">
                                                <Zap size={28} className="text-primary" />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-11 w-11 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                                onClick={(e) => handleDelete(workflow.id, e)}
                                            >
                                                <Trash2 size={20} />
                                            </Button>
                                        </div>
                                        <CardTitle className="font-black text-2xl tracking-tight mt-8 line-clamp-1 text-slate-900 group-hover:text-primary transition-colors duration-500">
                                            {workflow.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6 px-8 pb-10 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Assistant</span>
                                            <span className="text-[11px] font-bold bg-blue-50 px-4 py-1.5 rounded-full text-blue-600 border border-blue-100">
                                                {workflow.assistant_id ? assistants.find(a => a.id === workflow.assistant_id)?.name || "Assistant" : "Global System"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Architecture</span>
                                            <span className="text-[11px] font-bold bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 text-slate-600 font-mono">
                                                {workflow.nodes.length} Blocks
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 pt-6 border-t border-slate-50">
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-pulse"></div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                                Active Deployment
                                            </span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="border-t border-slate-100 bg-slate-50/30 p-6 flex justify-between items-center group-hover:bg-slate-50 transition-all duration-500 relative z-10">
                                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                                            {new Date(workflow.created_at).toLocaleDateString()}
                                        </span>
                                        <div className="flex items-center gap-2 text-[11px] font-black text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-5 transition-all duration-700 uppercase tracking-widest">
                                            Open Builder <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </DashboardLayout>
    );
}
