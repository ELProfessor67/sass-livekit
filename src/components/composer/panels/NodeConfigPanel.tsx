import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    PencilSimple, Sparkle, Lightning, Envelope, ChatCircle, Clock,
    Plus, Trash, Info, CheckCircle, Warning, Activity, Globe
} from "phosphor-react";
import { Node } from "@xyflow/react";
import React from "react";
import { TwilioIcon, FacebookIcon } from "../nodes/IntegrationIcons";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { VariableInput } from "../components/VariableInput";
import { useEffect, useState } from "react";

interface NodeConfigPanelProps {
    node: Node<any>;
    onUpdate: (nodeId: string, data: any) => void;
    onDelete?: (nodeId: string) => void;
    customVariables?: string[]; // Custom variables from trigger node
}

function getNodeIcon(type: string) {
    switch (type) {
        case 'trigger':
            return <Lightning size={20} weight="duotone" className="text-purple-500" />;
        case 'action':
            return <Envelope size={20} weight="duotone" className="text-blue-500" />;
        case 'condition':
            return <ChatCircle size={20} weight="duotone" className="text-amber-500" />;
        case 'router':
            return <ChatCircle size={20} weight="duotone" className="text-indigo-500" />;
        case 'twilio_sms':
            return <TwilioIcon size={20} />;
        case 'facebook_leads':
            return <FacebookIcon size={20} />;
        default:
            return <Lightning size={20} weight="duotone" className="text-muted-foreground" />;
    }
}

export function NodeConfigPanel({ node, onUpdate, onDelete, customVariables = [] }: NodeConfigPanelProps) {
    const { user } = useAuth();
    const data = node.data;
    const integration = data.integration;
    const [slackConnections, setSlackConnections] = useState<any[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);

    useEffect(() => {
        if (integration === 'Slack' && user?.id) {
            loadSlackConnections();
        }
    }, [integration, user?.id]);

    const loadSlackConnections = async () => {
        if (!user?.id) return;
        setIsLoadingConnections(true);
        try {
            const res = await fetch(`/api/v1/connections?provider=slack&userId=${user.id}`);
            const data = await res.json();
            setSlackConnections(data.connections || []);
        } catch (error) {
            console.error("Error loading Slack connections:", error);
        } finally {
            setIsLoadingConnections(false);
        }
    };

    const handleFieldChange = (field: string, value: any) => {
        onUpdate(node.id, { [field]: value, configured: true });
    };

    return (
        <div className="space-y-6">
            {/* Node Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center backdrop-blur-sm">
                        {getNodeIcon(node.type || 'default')}
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground tracking-tight">{data.label}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{integration || node.type || 'Node'}</p>
                    </div>
                </div>

                {node.type !== 'trigger' && onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => onDelete(node.id)}
                    >
                        <Trash size={16} />
                    </Button>
                )}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

            {/* Configuration Form */}
            <div className="space-y-5">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Node Name</Label>
                    <Input
                        className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                        value={data.label}
                        onChange={(e) => handleFieldChange('label', e.target.value)}
                        placeholder="Enter node name..."
                    />
                </div>

                {/* Twilio Specific Fields */}
                {integration === 'Twilio' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Recipient Phone</Label>
                            <div className="h-9 px-3 rounded-md bg-muted/20 border border-border/50 flex items-center">
                                <span className="text-sm font-medium text-primary">{data.to_number || '{phone_number}'}</span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info size={12} className="ml-2 text-muted-foreground/60 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="glass-dropdown">
                                            <p className="text-[10px]">Automatically sends to the caller's phone number.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">SMS Message</Label>
                            <VariableInput
                                className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                value={data.message || ''}
                                onChange={(value) => handleFieldChange('message', value)}
                                placeholder="Message content..."
                                customVariables={customVariables}
                            />
                            <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                <Info size={10} />
                                Use {"{variable}"} to inject call data or results from previous nodes (e.g. {"{webhook_phone}"})
                            </p>
                        </div>
                    </div>
                )}

                {/* Slack Specific Fields */}
                {integration === 'Slack' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Slack Connection</Label>
                            <Select
                                value={data.connectionId || ''}
                                onValueChange={(val) => handleFieldChange('connectionId', val)}
                                disabled={isLoadingConnections}
                            >
                                <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9">
                                    <SelectValue placeholder={isLoadingConnections ? "Loading connections..." : "Select Slack Connection"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {slackConnections.map(conn => (
                                        <SelectItem key={conn.id} value={conn.id}>
                                            {conn.label}
                                        </SelectItem>
                                    ))}
                                    {slackConnections.length === 0 && !isLoadingConnections && (
                                        <div className="p-2 text-xs text-muted-foreground text-center">
                                            No Slack connections found
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                            {!data.connectionId && slackConnections.length === 0 && (
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="w-full h-8 text-xs"
                                    onClick={() => window.open('/settings?tab=integrations&connect=slack', '_blank')}
                                >
                                    <Plus size={12} className="mr-2" />
                                    Connect Slack
                                </Button>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Channel</Label>
                            <VariableInput
                                className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                value={data.channel || ''}
                                onChange={(value) => handleFieldChange('channel', value)}
                                placeholder="#general or @username"
                                customVariables={customVariables}
                            />
                            <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                <Info size={10} />
                                Use channel name (e.g., #general) or user ID (e.g., @U123456)
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Message</Label>
                            <VariableInput
                                className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                value={data.message || ''}
                                onChange={(value) => handleFieldChange('message', value)}
                                placeholder="Message content..."
                                customVariables={customVariables}
                            />
                            <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                <Info size={10} />
                                Use {"{variable}"} to inject call data or results from previous nodes
                            </p>
                        </div>
                    </div>
                )}

                {/* Webhook Specific Fields */}
                {(integration === 'Webhooks' || node.type === 'webhook') && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Webhook URL</Label>
                            <VariableInput
                                className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                value={data.url || ''}
                                onChange={(value) => handleFieldChange('url', value)}
                                placeholder="https://api.example.com/webhook"
                                customVariables={customVariables}
                            />
                            <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                <Info size={10} />
                                Use {"{variable}"} in URL or body.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Method</Label>
                            <Select
                                value={data.method || 'POST'}
                                onValueChange={(val) => handleFieldChange('method', val)}
                            >
                                <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9">
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="GET">GET</SelectItem>
                                    <SelectItem value="PUT">PUT</SelectItem>
                                    <SelectItem value="PATCH">PATCH</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {/* Condition Specific Fields */}
                {node.type === 'condition' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Conditions</Label>
                            <Select
                                value={data.condition_logic || 'AND'}
                                onValueChange={(val) => handleFieldChange('condition_logic', val)}
                            >
                                <SelectTrigger className="h-7 w-20 bg-muted/40 border-none text-[10px] font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AND">AND</SelectItem>
                                    <SelectItem value="OR">OR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            {(data.conditions || [{
                                variable: data.condition_variable || '',
                                operator: data.condition_operator || 'equals',
                                value: data.condition_value || ''
                            }]).map((cond: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-3 relative group">
                                    {idx > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 absolute -right-2 -top-2 rounded-full bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                const newConds = [...(data.conditions || [])];
                                                newConds.splice(idx, 1);
                                                handleFieldChange('conditions', newConds);
                                            }}
                                        >
                                            <Trash size={12} />
                                        </Button>
                                    )}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/60">Variable</Label>
                                        <VariableInput
                                            className="bg-background/50 border-border/30 text-xs h-8"
                                            value={cond.variable}
                                            onChange={(value) => {
                                                const newConds = [...(data.conditions || [{
                                                    variable: data.condition_variable,
                                                    operator: data.condition_operator,
                                                    value: data.condition_value
                                                }])];
                                                newConds[idx] = { ...newConds[idx], variable: value };
                                                handleFieldChange('conditions', newConds);
                                            }}
                                            placeholder="{variable}"
                                            customVariables={customVariables}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground/60">Operator</Label>
                                            <Select
                                                value={cond.operator}
                                                onValueChange={(val) => {
                                                    const newConds = [...(data.conditions || [{
                                                        variable: data.condition_variable,
                                                        operator: data.condition_operator,
                                                        value: data.condition_value
                                                    }])];
                                                    newConds[idx] = { ...newConds[idx], operator: val };
                                                    handleFieldChange('conditions', newConds);
                                                }}
                                            >
                                                <SelectTrigger className="bg-background/50 border-border/30 text-xs h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="equals">Equals</SelectItem>
                                                    <SelectItem value="not_equals">≠</SelectItem>
                                                    <SelectItem value="contains">Contains</SelectItem>
                                                    <SelectItem value="not_contains">!Contains</SelectItem>
                                                    <SelectItem value="exists">Exists</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground/60">Value</Label>
                                            <Input
                                                className="bg-background/50 border-border/30 text-xs h-8"
                                                value={cond.value}
                                                onChange={(e) => {
                                                    const newConds = [...(data.conditions || [{
                                                        variable: data.condition_variable,
                                                        operator: data.condition_operator,
                                                        value: data.condition_value
                                                    }])];
                                                    newConds[idx] = { ...newConds[idx], value: e.target.value };
                                                    handleFieldChange('conditions', newConds);
                                                }}
                                                placeholder="Value"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-[10px] font-bold uppercase tracking-wider h-8 border-dashed border-primary/20 hover:bg-primary/5"
                                onClick={() => {
                                    const currentConds = data.conditions || [{
                                        variable: data.condition_variable || '',
                                        operator: data.condition_operator || 'equals',
                                        value: data.condition_value || ''
                                    }];
                                    handleFieldChange('conditions', [...currentConds, { variable: '', operator: 'equals', value: '' }]);
                                }}
                            >
                                <Plus size={12} className="mr-2" />
                                Add Condition
                            </Button>
                        </div>
                    </div>
                )}

                {/* Router Specific Fields */}
                {node.type === 'router' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Branches</Label>
                            <p className="text-[10px] text-muted-foreground/50">Each branch routes to different paths</p>
                        </div>

                        <div className="space-y-3">
                            {(data.branches || []).map((branch: any, idx: number) => (
                                <div key={branch.id || idx} className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-3 relative group">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 absolute -right-2 -top-2 rounded-full bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => {
                                            const newBranches = [...(data.branches || [])];
                                            newBranches.splice(idx, 1);
                                            handleFieldChange('branches', newBranches);
                                        }}
                                    >
                                        <Trash size={12} />
                                    </Button>
                                    
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/60">Branch Label</Label>
                                        <Input
                                            className="bg-background/50 border-border/30 text-xs h-8"
                                            value={branch.label || ''}
                                            onChange={(e) => {
                                                const newBranches = [...(data.branches || [])];
                                                newBranches[idx] = { ...newBranches[idx], label: e.target.value };
                                                handleFieldChange('branches', newBranches);
                                            }}
                                            placeholder="e.g., Booked Appointment"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/60">Condition Variable</Label>
                                        <VariableInput
                                            className="bg-background/50 border-border/30 text-xs h-8"
                                            value={branch.condition?.variable || ''}
                                            onChange={(value) => {
                                                const newBranches = [...(data.branches || [])];
                                                newBranches[idx] = {
                                                    ...newBranches[idx],
                                                    condition: {
                                                        ...(newBranches[idx].condition || { operator: 'contains', value: '' }),
                                                        variable: value
                                                    }
                                                };
                                                handleFieldChange('branches', newBranches);
                                            }}
                                            placeholder="{outcome}"
                                            customVariables={customVariables}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground/60">Operator</Label>
                                            <Select
                                                value={branch.condition?.operator || 'contains'}
                                                onValueChange={(val) => {
                                                    const newBranches = [...(data.branches || [])];
                                                    newBranches[idx] = {
                                                        ...newBranches[idx],
                                                        condition: {
                                                            ...(newBranches[idx].condition || { variable: '', value: '' }),
                                                            operator: val
                                                        }
                                                    };
                                                    handleFieldChange('branches', newBranches);
                                                }}
                                            >
                                                <SelectTrigger className="bg-background/50 border-border/30 text-xs h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="equals">Equals</SelectItem>
                                                    <SelectItem value="not_equals">≠</SelectItem>
                                                    <SelectItem value="contains">Contains</SelectItem>
                                                    <SelectItem value="not_contains">!Contains</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground/60">Value</Label>
                                            <Input
                                                className="bg-background/50 border-border/30 text-xs h-8"
                                                value={branch.condition?.value || ''}
                                                onChange={(e) => {
                                                    const newBranches = [...(data.branches || [])];
                                                    newBranches[idx] = {
                                                        ...newBranches[idx],
                                                        condition: {
                                                            ...(newBranches[idx].condition || { variable: '', operator: 'contains' }),
                                                            value: e.target.value
                                                        }
                                                    };
                                                    handleFieldChange('branches', newBranches);
                                                }}
                                                placeholder="e.g., booked"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-[10px] font-bold uppercase tracking-wider h-8 border-dashed border-indigo-500/20 hover:bg-indigo-500/5"
                                onClick={() => {
                                    const newBranch = {
                                        id: Math.random().toString(36).substring(7),
                                        label: `Branch ${(data.branches || []).length + 1}`,
                                        condition: {
                                            variable: '{outcome}',
                                            operator: 'contains',
                                            value: ''
                                        }
                                    };
                                    handleFieldChange('branches', [...(data.branches || []), newBranch]);
                                }}
                            >
                                <Plus size={12} className="mr-2" />
                                Add Branch
                            </Button>
                        </div>
                    </div>
                )}


                {node.type === 'trigger' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Trigger Type</Label>
                            <Select
                                value={data.trigger_type || 'webhook'}
                                onValueChange={(val) => handleFieldChange('trigger_type', val)}
                            >
                                <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9">
                                    <SelectValue placeholder="Select trigger..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="webhook">Webhook (Post-Call Event)</SelectItem>
                                    <SelectItem value="facebook_leads">Facebook Leads</SelectItem>
                                    <SelectItem value="schedule">Schedule (Time-based)</SelectItem>
                                    <SelectItem value="manual">Manual Trigger</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>


                        {/* Output Variables Section */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Available Post-Call Data</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info size={14} className="text-muted-foreground/60 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="glass-dropdown p-3 max-w-[200px]">
                                            <p className="text-[11px] leading-relaxed">These variables are automatically captured after each call ends and will be sent to your webhook.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            {/* Standard Variables (Editable) */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Core Call Data Mappings</Label>
                                <div className="grid gap-2">
                                    {[
                                        { id: 'name', label: 'Contact Name' },
                                        { id: 'summary', label: 'AI Summary' },
                                        { id: 'outcome', label: 'Call Outcome' },
                                        { id: 'duration', label: 'Call Duration' },
                                        { id: 'transcript', label: 'Full Transcript' }
                                    ].filter(v => !(data.disabled_core_mappings || []).includes(v.id)).map((v) => {
                                        const mappingKey = `mapping_${v.id}`;
                                        const currentVal = data[mappingKey] || v.id;

                                        return (
                                            <div key={v.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] group transition-all hover:bg-white/[0.04]">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-muted-foreground/40 font-medium uppercase truncate">{v.label}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-primary/40 text-[10px] font-mono">{"{"}</span>
                                                        <input
                                                            className="flex-1 bg-transparent border-none p-0 text-xs font-mono text-primary/80 focus:ring-0 placeholder:text-primary/20"
                                                            value={currentVal}
                                                            onChange={(e) => handleFieldChange(mappingKey, e.target.value)}
                                                            placeholder={v.id}
                                                        />
                                                        <span className="text-primary/40 text-[10px] font-mono">{"}"}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            const disabled = [...(data.disabled_core_mappings || []), v.id];
                                                            handleFieldChange('disabled_core_mappings', disabled);
                                                        }}
                                                    >
                                                        <Trash size={12} />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Restore Button (only if something is deleted) */}
                                    {(data.disabled_core_mappings || []).length > 0 && (
                                        <Button
                                            variant="ghost"
                                            className="w-full h-8 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/40 hover:text-primary/60 hover:bg-primary/5 border border-dashed border-white/5 mt-2"
                                            onClick={() => handleFieldChange('disabled_core_mappings', [])}
                                        >
                                            Restore All Hidden Core Mappings
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Custom Variables */}
                            <div className="space-y-3 pt-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Custom Variables (Expected)</Label>
                                <div className="space-y-2">
                                    {(data.expected_variables || []).map((v: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                                                <code className="text-[11px] font-mono text-primary">{`{${v}}`}</code>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    const newVars = [...(data.expected_variables || [])];
                                                    newVars.splice(idx, 1);
                                                    handleFieldChange('expected_variables', newVars);
                                                }}
                                            >
                                                <Trash size={14} />
                                            </Button>
                                        </div>
                                    ))}

                                    <div className="flex gap-2">
                                        <Input
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            placeholder="Enter variable name (e.g. email)"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = (e.target as HTMLInputElement).value.trim();
                                                    if (val) {
                                                        const newVars = [...(data.expected_variables || []), val];
                                                        handleFieldChange('expected_variables', newVars);
                                                        (e.target as HTMLInputElement).value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 shrink-0 border-primary/20 hover:bg-primary/5"
                                            onClick={(e) => {
                                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                const val = input.value.trim();
                                                if (val) {
                                                    const newVars = [...(data.expected_variables || []), val];
                                                    handleFieldChange('expected_variables', newVars);
                                                    input.value = '';
                                                }
                                            }}
                                        >
                                            <Plus size={16} />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground/40 italic">Type a name and press Enter to add as a variable</p>
                            </div>
                        </div >
                    </div >
                )}
            </div>

            <div className="pt-4">
                <Button variant="outline" className="w-full gap-2 border-dashed border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all">
                    <Sparkle size={16} weight="duotone" className="text-primary" />
                    <span className="text-xs font-medium">Generate Sample Data (AI)</span>
                </Button>
            </div>
        </div >
    );
}

const FacebookLeadsTriggerConfig = ({ node, onUpdate, userId }: { node: Node, onUpdate: (nodeId: string, data: any) => void, userId?: string }) => {
    const [facebookConnections, setFacebookConnections] = useState<any[]>([]);
    const [pages, setPages] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const [testLead, setTestLead] = useState<any>(null);
    const data: any = node.data;

    useEffect(() => {
        if (userId) {
            loadFacebookConnections();
        }
    }, [userId]);

    useEffect(() => {
        if (userId && data.connectionId && facebookConnections.length > 0) {
            fetchPagesAndForms();
        }
    }, [userId, data.connectionId, facebookConnections]);

    const loadFacebookConnections = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/v1/connections?provider=facebook&userId=${userId}`);
            const data = await res.json();
            setFacebookConnections(data.connections || []);
        } catch (error) {
            console.error('Failed to fetch Facebook connections:', error);
        }
    };

    const fetchPagesAndForms = async () => {
        if (!userId || !data.connectionId) return;
        setIsLoading(true);
        try {
            const connection = facebookConnections.find(c => c.id === data.connectionId);
            if (!connection) {
                console.error('Connection not found');
                return;
            }

            // Use the connection's access token to fetch pages and forms
            const resp = await fetch(`/api/v1/integrations/facebook/lead-forms?userId=${userId}&facebookUserId=${connection.workspace_id}`);
            const json = await resp.json();
            setPages(json.pages || []);
            setForms(json.forms || []);
        } catch (err) {
            console.error('Failed to fetch Facebook data:', err);
        } finally {
            setIsLoading(false);
        }
    };


    const handleActivate = async () => {
        if (!userId || !data.page_id || !data.connectionId) return;
        setIsActivating(true);
        try {
            const connection = facebookConnections.find(c => c.id === data.connectionId);
            if (!connection) {
                throw new Error('Connection not found');
            }

            const resp = await fetch(`/api/v1/integrations/facebook/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, facebookUserId: connection.workspace_id, pageId: data.page_id })
            });
            const json = await resp.json();
            if (json.success) {
                onUpdate(node.id, { webhook_active: true });
            }
        } catch (err) {
            console.error('Failed to activate webhook:', err);
        } finally {
            setIsActivating(false);
        }
    };

    const fetchTestLead = async () => {
        if (!userId || !data.form_id || !data.connectionId) return;
        setIsLoading(true);
        try {
            const connection = facebookConnections.find(c => c.id === data.connectionId);
            if (!connection) {
                throw new Error('Connection not found');
            }

            const resp = await fetch(`/api/v1/integrations/facebook/test-lead?userId=${userId}&facebookUserId=${connection.workspace_id}&formId=${data.form_id}`);
            const json = await resp.json();
            setTestLead(json.lead);
        } catch (err) {
            console.error('Failed to fetch test lead:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-5 pt-4 border-t border-border/30">
            {/* Facebook Connection Selection */}
            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Facebook Connection</Label>
                <Select
                    value={data.connectionId || ""}
                    onValueChange={(val) => {
                        onUpdate(node.id, {
                            connectionId: val,
                            page_id: "", // Reset downstream selections
                            page_name: "",
                            form_id: "",
                            form_name: "",
                            webhook_active: false
                        });
                    }}
                >
                    <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9">
                        <SelectValue placeholder="Select Facebook Connection" />
                    </SelectTrigger>
                    <SelectContent>
                        {facebookConnections.map(conn => (
                            <SelectItem key={conn.id} value={conn.id}>
                                {conn.label}
                            </SelectItem>
                        ))}
                        {facebookConnections.length === 0 && (
                            <div className="p-2 text-xs text-muted-foreground text-center">
                                No Facebook connections found
                            </div>
                        )}
                    </SelectContent>
                </Select>
                {!data.connectionId && facebookConnections.length === 0 && (
                    <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => window.open('/settings?tab=integrations&connect=facebook', '_blank')}
                    >
                        <Plus size={12} className="mr-2" />
                        Connect Facebook
                    </Button>
                )}
                <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                    <Info size={10} />
                    Configure Facebook connection in Settings → Integrations
                </p>
            </div>

            {/* Page Selection */}
            {data.connectionId && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">1. Select Facebook Page</Label>
                    <Select
                        value={data.page_id || ""}
                        onValueChange={(val) => {
                            const page = pages.find(p => p.id === val);
                            onUpdate(node.id, {
                                page_id: val,
                                page_name: page?.name,
                                form_id: "", // Reset form on page change
                                webhook_active: false
                            });
                        }}
                    >
                        <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9">
                            <SelectValue placeholder={isLoading ? "Loading pages..." : "Select page..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {pages.map(page => (
                                <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Form Selection */}
            {data.page_id && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">2. Select Lead Form</Label>
                    </div>
                    <Select
                        value={data.form_id || ""}
                        onValueChange={(val) => {
                            const form = forms.find(f => f.id === val);
                            onUpdate(node.id, {
                                form_id: val,
                                form_name: form?.name,
                                configured: true
                            });
                        }}
                    >
                        <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9">
                            <SelectValue placeholder="Select lead form..." />
                        </SelectTrigger>
                        <SelectContent>
                            {forms.filter(f => f.page_id === data.page_id).map(form => (
                                <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>
                            ))}
                            {forms.filter(f => f.page_id === data.page_id).length === 0 && (
                                <p className="p-2 text-xs text-muted-foreground text-center">No forms found on this page.</p>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Automation Status & Buttons */}
            {data.form_id && (
                <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                    {/* Webhook Activation */}
                    <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground/70">Webhook Subscription</span>
                            {data.webhook_active ? (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] gap-1 px-1.5 h-5">
                                    <CheckCircle size={10} weight="fill" /> Active
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] gap-1 px-1.5 h-5">
                                    <Warning size={10} weight="fill" /> Pending
                                </Badge>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                            Facebook requires your page to be subscribed to our app to receive leads in real-time.
                        </p>
                        {!data.webhook_active && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-[10px] font-bold uppercase tracking-wider border-primary/20 hover:bg-primary/5 text-primary"
                                onClick={handleActivate}
                                disabled={isActivating}
                            >
                                {isActivating ? <Activity size={12} className="animate-spin mr-2" /> : <Lightning size={12} className="mr-2" />}
                                Activate Real-time Sync
                            </Button>
                        )}
                    </div>

                    {/* Test Lead */}
                    <div className="space-y-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground"
                            onClick={fetchTestLead}
                            disabled={isLoading}
                        >
                            <Clock size={12} className="mr-2" />
                            Fetch Sample Lead Data
                        </Button>

                        {testLead && (
                            <div className="p-3 rounded-xl bg-black/20 border border-white/5 font-mono text-[10px] overflow-hidden">
                                <p className="text-primary/60 mb-1 font-bold">// Last Lead Found:</p>
                                <div className="max-h-32 overflow-y-auto custom-scrollbar text-muted-foreground/80">
                                    {testLead.field_data?.map((f: any) => (
                                        <div key={f.name} className="flex justify-between py-0.5 border-b border-white/5 last:border-0">
                                            <span className="text-primary/40">{f.name}:</span>
                                            <span className="text-white/70">{f.values[0]}</span>
                                        </div>
                                    ))}
                                    {(!testLead.field_data || testLead.field_data.length === 0) && (
                                        <span className="italic">No data fields found in lead.</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

