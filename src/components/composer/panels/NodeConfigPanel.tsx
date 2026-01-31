import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    PencilSimple, Sparkle, Lightning, Envelope, ChatCircle, Clock,
    Plus, Trash, Info, CheckCircle, Warning, Activity, Globe,
    Microphone, Code, CaretUp, CaretDown, PhoneCall
} from "phosphor-react";
import { Node } from "@xyflow/react";
import React from "react";
import { TwilioIcon, FacebookIcon, HubSpotIcon } from "../nodes/IntegrationIcons";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { fetchAssistants, Assistant } from "@/lib/api/assistants/fetchAssistants";
import { VariableInput } from "../components/VariableInput";
import { useEffect, useState } from "react";
import { getVariableRegistry, formatVariableKey } from "../utils/variableRegistry";
import { integrationTriggers } from "../data/integrationActions";

interface NodeConfigPanelProps {
    node: Node<any>;
    onUpdate: (nodeId: string, data: any) => void;
    onDelete?: (nodeId: string) => void;
    customVariables?: string[]; // Custom variables from trigger node
    triggerType?: string; // Type of trigger (e.g., 'hubspot_contact_created')
    workflowAssistantId?: string | null;
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
        case 'call_lead':
            return <PhoneCall size={20} weight="duotone" className="text-emerald-500" />;
        case 'action':
        default:
            return <Lightning size={20} weight="duotone" className="text-muted-foreground" />;
    }
}

function getNodeIconFixed(type: string, integration?: string) {
    if (integration === 'Call Lead' || type === 'call_lead') {
        return <PhoneCall size={20} weight="duotone" className="text-emerald-500" />;
    }
    return getNodeIcon(type);
}

export function NodeConfigPanel({ node, onUpdate, onDelete, customVariables = [], triggerType, workflowAssistantId }: NodeConfigPanelProps) {
    const { user } = useAuth();
    const data = node.data;
    const integration = data.integration;
    const [slackConnections, setSlackConnections] = useState<any[]>([]);
    const [hubspotConnections, setHubspotConnections] = useState<any[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [isLoadingAssistants, setIsLoadingAssistants] = useState(false);

    useEffect(() => {
        if (integration === 'Slack' && user?.id) {
            loadSlackConnections();
        }
        if (integration === 'HubSpot' && user?.id) {
            loadHubspotConnections();
        }
        if (node.type === 'call_lead') {
            loadAssistants();
        }
    }, [integration, node.type, user?.id]);

    const loadAssistants = async () => {
        setIsLoadingAssistants(true);
        try {
            const res = await fetchAssistants();
            setAssistants(res.assistants);
        } catch (error) {
            console.error("Error loading assistants:", error);
        } finally {
            setIsLoadingAssistants(false);
        }
    };

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

    const loadHubspotConnections = async () => {
        if (!user?.id) return;
        setIsLoadingConnections(true);
        try {
            const res = await fetch(`/api/v1/connections?provider=hubspot&userId=${user.id}`);
            const fetchedData = await res.json();
            const connections = fetchedData.connections || [];
            setHubspotConnections(connections);

            // Auto-select if none selected and connections available
            if (!data.connectionId && connections.length > 0) {
                handleFieldChange('connectionId', connections[0].id);
            }
        } catch (error) {
            console.error("Error loading HubSpot connections:", error);
        } finally {
            setIsLoadingConnections(false);
        }
    };

    const handleFieldChange = (field: string, value: any) => {
        onUpdate(node.id, { [field]: value, configured: true });
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {/* Node Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center backdrop-blur-sm">
                            {getNodeIconFixed(node.type || 'default', integration)}
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
                                    multiline={true}
                                    className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm min-h-[100px] pt-2"
                                    value={data.message || ''}
                                    onChange={(value) => handleFieldChange('message', value)}
                                    placeholder="Message content..."
                                    customVariables={customVariables}
                                    triggerType={triggerType}
                                />
                                <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                    <Info size={10} />
                                    Use {"{variable}"} to inject call data or results from previous nodes (e.g. {"{webhook_phone}"})
                                </p>
                            </div>

                            {workflowAssistantId && (
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Sparkle size={14} weight="fill" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Workflow Assistant Active</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        This SMS will be sent using the phone number associated with the assistant assigned to this workflow.
                                    </p>
                                </div>
                            )}
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
                                    triggerType={triggerType}
                                />
                                <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                    <Info size={10} />
                                    Use channel name (e.g., #general) or user ID (e.g., @U123456)
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Message</Label>
                                <VariableInput
                                    multiline={true}
                                    className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm min-h-[100px] pt-2"
                                    value={data.message || ''}
                                    onChange={(value) => handleFieldChange('message', value)}
                                    placeholder="Message content..."
                                    customVariables={customVariables}
                                    triggerType={triggerType}
                                />
                                <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                    <Info size={10} />
                                    Use {"{variable}"} to inject call data or results from previous nodes
                                </p>
                            </div>
                        </div>
                    )}

                    {/* HubSpot Specific Fields */}
                    {integration === 'HubSpot' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">HubSpot Connection</Label>
                                {hubspotConnections.length > 0 ? (
                                    <div className="group relative overflow-hidden rounded-2xl p-[1px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,165,0,0.15)] animate-in fade-in slide-in-from-top-2">
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-transparent opacity-50" />
                                        <div className="relative flex items-center justify-between p-3 rounded-[15px] bg-muted/20 border border-white/5 backdrop-blur-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                                        <HubSpotIcon size={24} />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background flex items-center justify-center border border-border/50">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-[11px] font-bold text-foreground tracking-tight">Active Connection</h4>
                                                    <p className="text-[10px] text-muted-foreground/70 font-medium">
                                                        Portal: <span className="text-orange-500/80 font-bold">{hubspotConnections.find(c => c.id === data.connectionId)?.label || hubspotConnections[0].label}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[8px] h-4 bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-bold uppercase tracking-widest px-1.5">Connected</Badge>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-10 text-[10px] font-bold uppercase tracking-widest border-dashed border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 text-orange-500 transition-all rounded-xl"
                                            onClick={() => window.open('/settings?tab=integrations&connect=hubspot', '_blank')}
                                        >
                                            <Plus size={14} className="mr-2" />
                                            Connect HubSpot
                                        </Button>
                                        <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                            <Info size={10} weight="fill" />
                                            No active HubSpot connection found.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Action Specific Fields */}
                            {data.actionId === 'create_contact' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Email</Label>
                                        <VariableInput
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.email || ''}
                                            onChange={(val) => handleFieldChange('email', val)}
                                            placeholder="{email}"
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">First Name</Label>
                                        <VariableInput
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.firstname || ''}
                                            onChange={(val) => handleFieldChange('firstname', val)}
                                            placeholder="{name}"
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Phone</Label>
                                        <VariableInput
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.phone || ''}
                                            onChange={(val) => handleFieldChange('phone', val)}
                                            placeholder="{phone}"
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                </div>
                            )}

                            {data.actionId === 'update_contact' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Contact ID or Email</Label>
                                        <VariableInput
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.contact_identifier || ''}
                                            onChange={(val) => handleFieldChange('contact_identifier', val)}
                                            placeholder="{email} or 12345"
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Properties to Update (JSON)</Label>
                                        <VariableInput
                                            multiline={true}
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm min-h-[100px] pt-2"
                                            value={data.properties_json || ''}
                                            onChange={(val) => handleFieldChange('properties_json', val)}
                                            placeholder='{ "firstname": "{name}" }'
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                </div>
                            )}

                            {data.actionId === 'create_company' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Company Name</Label>
                                        <VariableInput
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.company_name || ''}
                                            onChange={(val) => handleFieldChange('company_name', val)}
                                            placeholder="Acme Corp"
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Domain</Label>
                                        <VariableInput
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.domain || ''}
                                            onChange={(val) => handleFieldChange('domain', val)}
                                            placeholder="acme.com"
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                </div>
                            )}

                            {data.actionId === 'create_deal' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Deal Name</Label>
                                        <VariableInput
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.dealname || ''}
                                            onChange={(val) => handleFieldChange('dealname', val)}
                                            placeholder="New Deal"
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Amount</Label>
                                        <VariableInput
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.amount || ''}
                                            onChange={(val) => handleFieldChange('amount', val)}
                                            placeholder="1000"
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                </div>
                            )}

                            {data.actionId === 'create_associations' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">From Object ID</Label>
                                        <VariableInput
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.from_id || ''}
                                            onChange={(val) => handleFieldChange('from_id', val)}
                                            placeholder="Contact ID"
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">To Object ID</Label>
                                        <VariableInput
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.to_id || ''}
                                            onChange={(val) => handleFieldChange('to_id', val)}
                                            placeholder="Company ID"
                                            customVariables={customVariables}
                                            triggerType={triggerType}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Association Type</Label>
                                        <Input
                                            className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                            value={data.association_type || 'contact_to_company'}
                                            onChange={(e) => handleFieldChange('association_type', e.target.value)}
                                            placeholder="contact_to_company"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* HTTP Request Specific Fields */}
                    {integration === 'HTTP Request' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">API URL</Label>
                                <VariableInput
                                    className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                    value={data.url || ''}
                                    onChange={(value) => handleFieldChange('url', value)}
                                    placeholder="https://api.example.com/data"
                                    customVariables={customVariables}
                                    triggerType={triggerType}
                                />
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
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">POST</SelectItem>
                                        <SelectItem value="PUT">PUT</SelectItem>
                                        <SelectItem value="PATCH">PATCH</SelectItem>
                                        <SelectItem value="DELETE">DELETE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Headers</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-[10px] font-bold uppercase"
                                        onClick={() => {
                                            const headers = [...(data.headers || [])];
                                            headers.push({ key: '', value: '' });
                                            handleFieldChange('headers', headers);
                                        }}
                                    >
                                        <Plus size={10} className="mr-1" /> Add Header
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {(data.headers || []).map((header: { key: string, value: string }, idx: number) => (
                                        <div key={idx} className="flex gap-2 items-start group">
                                            <div className="flex-1 space-y-1">
                                                <Input
                                                    className="bg-muted/20 border-border/30 text-xs h-7"
                                                    value={header.key}
                                                    onChange={(e) => {
                                                        const headers = [...data.headers];
                                                        headers[idx] = { ...headers[idx], key: e.target.value };
                                                        handleFieldChange('headers', headers);
                                                    }}
                                                    placeholder="Key (e.g. Authorization)"
                                                />
                                            </div>
                                            <div className="flex-[2] space-y-1">
                                                <VariableInput
                                                    className="bg-muted/20 border-border/30 text-xs h-7"
                                                    value={header.value}
                                                    onChange={(val) => {
                                                        const headers = [...data.headers];
                                                        headers[idx] = { ...headers[idx], value: val };
                                                        handleFieldChange('headers', headers);
                                                    }}
                                                    placeholder="Value"
                                                    customVariables={customVariables}
                                                    triggerType={triggerType}
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => {
                                                    const headers = data.headers.filter((_: any, i: number) => i !== idx);
                                                    handleFieldChange('headers', headers);
                                                }}
                                            >
                                                <Trash size={12} />
                                            </Button>
                                        </div>
                                    ))}
                                    {(!data.headers || data.headers.length === 0) && (
                                        <p className="text-[10px] text-muted-foreground/40 italic">No custom headers defined.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">JSON Body</Label>
                                <VariableInput
                                    multiline={true}
                                    className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm min-h-[120px] pt-2 font-mono"
                                    value={data.body || ''}
                                    onChange={(value) => handleFieldChange('body', value)}
                                    placeholder='{ "key": "{variable}" }'
                                    customVariables={customVariables}
                                    triggerType={triggerType}
                                />
                                <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                    <Info size={10} />
                                    Standard JSON format. Use {"{variable}"} to inject data.
                                </p>
                            </div>

                            <div className="h-px bg-border/20 my-2" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Response Mapping</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-[10px] font-bold uppercase"
                                        onClick={() => {
                                            const outputs = [...(data.expected_outputs || [])];
                                            outputs.push('');
                                            handleFieldChange('expected_outputs', outputs);
                                        }}
                                    >
                                        <Plus size={10} className="mr-1" /> Add Variable
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground/50">Define variables you expect in the JSON response to use them in later nodes.</p>
                                <div className="space-y-2">
                                    {(data.expected_outputs || []).map((key: string, idx: number) => (
                                        <div key={idx} className="flex gap-2 items-center group">
                                            <Input
                                                className="bg-muted/30 border-border/50 text-xs h-8"
                                                value={key}
                                                onChange={(e) => {
                                                    const outputs = [...data.expected_outputs];
                                                    outputs[idx] = e.target.value;
                                                    handleFieldChange('expected_outputs', outputs);
                                                }}
                                                placeholder="e.g. user_id"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => {
                                                    const outputs = data.expected_outputs.filter((_: any, i: number) => i !== idx);
                                                    handleFieldChange('expected_outputs', outputs);
                                                }}
                                            >
                                                <Trash size={12} />
                                            </Button>
                                        </div>
                                    ))}
                                    {(!data.expected_outputs || data.expected_outputs.length === 0) && (
                                        <p className="text-[10px] text-muted-foreground/40 italic">No response variables defined.</p>
                                    )}
                                </div>
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
                                    triggerType={triggerType}
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
                                                triggerType={triggerType}
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
                                )).reverse()}

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
                                                triggerType={triggerType}
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

                    {/* Call Lead Specific Fields */}
                    {(node.type === 'call_lead' || integration === 'Call Lead') && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Select Assistant</Label>
                                {workflowAssistantId ? (
                                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-primary">
                                                <Sparkle size={14} weight="fill" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Using Workflow Assistant</span>
                                            </div>
                                            <Badge variant="outline" className="text-[9px] h-4 bg-primary/10 border-primary/20 text-primary">Active</Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            This node is automatically using the assistant assigned to the entire workflow: <strong>{assistants.find(a => a.id === workflowAssistantId)?.name || 'Loading...'}</strong>
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <Select
                                            value={data.assistant_id || ''}
                                            onValueChange={(val) => handleFieldChange('assistant_id', val)}
                                            disabled={isLoadingAssistants}
                                        >
                                            <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9">
                                                <SelectValue placeholder={isLoadingAssistants ? "Loading..." : "Select Assistant"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {assistants.map(assistant => (
                                                    <SelectItem key={assistant.id} value={assistant.id}>
                                                        {assistant.name}
                                                    </SelectItem>
                                                ))}
                                                {assistants.length === 0 && !isLoadingAssistants && (
                                                    <div className="p-2 text-xs text-muted-foreground text-center">
                                                        No assistants found
                                                    </div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                            <Info size={10} />
                                            The call will use this assistant's prompt, voice, and phone number.
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Recipient Phone</Label>
                                <VariableInput
                                    className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                    value={data.to_number || '{phone_number}'}
                                    onChange={(value) => handleFieldChange('to_number', value)}
                                    placeholder="{phone_number}"
                                    customVariables={customVariables}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Recipient Name</Label>
                                <VariableInput
                                    className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                    value={data.recipient_name || '{name}'}
                                    onChange={(value) => handleFieldChange('recipient_name', value)}
                                    placeholder="{name}"
                                    customVariables={customVariables}
                                />
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
                                        {Object.entries(integrationTriggers).map(([group, items]) => (
                                            <SelectGroup key={group}>
                                                <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground/50 px-2 py-1.5">{group}</SelectLabel>
                                                {items.map(item => (
                                                    <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {data.trigger_type === 'hubspot_contact_created' && (
                                    <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1 mt-2">
                                        <Info size={10} />
                                        Workflows will trigger when a contact is created in HubSpot.
                                        Variables: {"{contact_name}"}, {"{contact_email}"}, {"{contact_phone}"}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>


        </div>
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

