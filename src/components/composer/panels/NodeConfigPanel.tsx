import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    PencilSimple, Sparkle, Lightning, Envelope, ChatCircle, Clock,
    Plus, Trash, Info, CheckCircle, Warning, Activity, Globe
} from "phosphor-react";
import { Node } from "@xyflow/react";
import React, { useState } from "react";
import { TwilioIcon, FacebookIcon } from "../nodes/IntegrationIcons";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/SupportAccessAuthContext";

interface NodeConfigPanelProps {
    node: Node<any>;
    onUpdate: (nodeId: string, data: any) => void;
    onDelete?: (nodeId: string) => void;
}

function getNodeIcon(type: string) {
    switch (type) {
        case 'trigger':
            return <Lightning size={20} weight="duotone" className="text-purple-500" />;
        case 'action':
            return <Envelope size={20} weight="duotone" className="text-blue-500" />;
        case 'condition':
            return <ChatCircle size={20} weight="duotone" className="text-amber-500" />;
        case 'twilio_sms':
            return <TwilioIcon size={20} />;
        case 'facebook_leads':
            return <FacebookIcon size={20} />;
        default:
            return <Lightning size={20} weight="duotone" className="text-muted-foreground" />;
    }
}

export function NodeConfigPanel({ node, onUpdate, onDelete }: NodeConfigPanelProps) {
    const { user } = useAuth();
    const data = node.data;
    const integration = data.integration;

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
                            <Input
                                className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                value={data.message || ''}
                                onChange={(e) => handleFieldChange('message', e.target.value)}
                                placeholder="Message content..."
                            />
                            <p className="text-[10px] text-muted-foreground/40 italic flex items-center gap-1">
                                <Info size={10} />
                                Use {"{variable}"} to inject call data or results from previous nodes (e.g. {"{webhook_phone}"})
                            </p>
                        </div>
                    </div>
                )}

                {/* Webhook Specific Fields */}
                {(integration === 'Webhooks' || node.type === 'webhook') && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Webhook URL</Label>
                            <Input
                                className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                value={data.url || ''}
                                onChange={(e) => handleFieldChange('url', e.target.value)}
                                placeholder="https://api.example.com/webhook"
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
                                        <Input
                                            className="bg-background/50 border-border/30 text-xs h-8"
                                            value={cond.variable}
                                            onChange={(e) => {
                                                const newConds = [...(data.conditions || [{
                                                    variable: data.condition_variable,
                                                    operator: data.condition_operator,
                                                    value: data.condition_value
                                                }])];
                                                newConds[idx] = { ...newConds[idx], variable: e.target.value };
                                                handleFieldChange('conditions', newConds);
                                            }}
                                            placeholder="{variable}"
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
                                    <SelectItem value="schedule">Schedule (Time-based)</SelectItem>
                                    <SelectItem value="manual">Manual Trigger</SelectItem>
                                    <SelectItem value="facebook_leads">Facebook Leads</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {data.trigger_type === 'facebook_leads' && (
                            <FacebookLeadsConfig
                                node={node}
                                onUpdate={onUpdate}
                                userId={user?.id}
                            />
                        )}

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

const FacebookLeadsConfig = ({ node, onUpdate, userId }: { node: Node, onUpdate: (nodeId: string, data: any) => void, userId?: string }) => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [pages, setPages] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const [testLead, setTestLead] = useState<any>(null);
    const [appId, setAppId] = useState("");
    const [appSecret, setAppSecret] = useState("");
    const data: any = node.data;

    const handleConnect = () => {
        if (!userId || !appId || !appSecret) {
            alert("Please enter both Facebook App ID and App Secret");
            return;
        }
        window.location.href = `/api/v1/integrations/facebook/auth?userId=${userId}&appId=${appId}&appSecret=${appSecret}`;
    };


    const fetchAccounts = async () => {
        if (!userId) return;
        try {
            const resp = await fetch(`/api/v1/integrations/facebook/accounts?userId=${userId}`);
            const json = await resp.json();
            setAccounts(json.accounts || []);

            // If there's only one account and none selected, auto-select it
            if (json.accounts?.length === 1 && !data.facebook_user_id) {
                onUpdate(node.id, { facebook_user_id: json.accounts[0].facebook_user_id });
            }
        } catch (err) {
            console.error('Failed to fetch Facebook accounts:', err);
        }
    };

    const fetchData = async (fbUserId: string) => {
        if (!userId || !fbUserId) return;
        setIsLoading(true);
        try {
            const resp = await fetch(`/api/v1/integrations/facebook/lead-forms?userId=${userId}&facebookUserId=${fbUserId}`);
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
        if (!userId || !data.page_id) return;
        setIsActivating(true);
        try {
            const resp = await fetch(`/api/v1/integrations/facebook/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, facebookUserId: data.facebook_user_id, pageId: data.page_id })
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
        if (!userId || !data.form_id) return;
        setIsLoading(true);
        try {
            const resp = await fetch(`/api/v1/integrations/facebook/test-lead?userId=${userId}&facebookUserId=${data.facebook_user_id}&formId=${data.form_id}`);
            const json = await resp.json();
            setTestLead(json.lead);
        } catch (err) {
            console.error('Failed to fetch test lead:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch of accounts
    React.useEffect(() => {
        if (userId) fetchAccounts();
    }, [userId]);

    // Re-fetch pages/forms when account changes
    React.useEffect(() => {
        if (userId && data.facebook_user_id) fetchData(data.facebook_user_id);
    }, [userId, data.facebook_user_id]);

    return (
        <div className="space-y-5 pt-4 border-t border-border/30">
            {/* App Credentials Input (Always visible or toggleable) */}
            <div className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                    <FacebookIcon size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Facebook Developers App Credentials</span>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-medium text-muted-foreground/70">App ID</Label>
                    <Input
                        type="password"
                        className="bg-background/50 border-border/30 text-xs h-8"
                        placeholder="Enter Facebook App ID"
                        value={appId}
                        onChange={(e) => setAppId(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-medium text-muted-foreground/70">App Secret</Label>
                    <Input
                        type="password"
                        className="bg-background/50 border-border/30 text-xs h-8"
                        placeholder="Enter Facebook App Secret"
                        value={appSecret}
                        onChange={(e) => setAppSecret(e.target.value)}
                    />
                </div>
                <Button
                    className="w-full h-8 text-[10px] font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-white"
                    onClick={handleConnect}
                >
                    <Plus size={12} className="mr-2" /> Connect New App
                </Button>
                <p className="text-[9px] text-muted-foreground/50 italic leading-relaxed">
                    * Make sure to add <code className="text-primary/70">{window.location.origin}/api/v1/integrations/facebook/callback</code> to your app's valid OAuth redirect URIs.
                </p>
            </div>

            {/* Account Selection */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Connected Accounts</Label>
                </div>

                {accounts.length > 0 ? (
                    <Select
                        value={data.facebook_user_id || ""}

                        onValueChange={(val) => {
                            onUpdate(node.id, {
                                facebook_user_id: val,
                                page_id: "", // Reset downstream selections
                                page_name: "",
                                form_id: "",
                                form_name: "",
                                webhook_active: false
                            });
                        }}
                    >
                        <SelectTrigger className="bg-primary/5 border-primary/10 text-xs h-10 font-medium">
                            <div className="flex items-center gap-2">
                                <Globe size={14} className="text-primary" />
                                <SelectValue placeholder="Select Facebook Account" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(acc => (
                                <SelectItem key={acc.facebook_user_id} value={acc.facebook_user_id}>
                                    ID: {acc.facebook_user_id} (Connected {new Date(acc.updated_at).toLocaleDateString()})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <Button variant="outline" className="w-full h-10 justify-start border-dashed text-muted-foreground" onClick={handleConnect}>
                        <Globe size={16} className="mr-2 opacity-50" />
                        No account connected
                    </Button>
                )}
            </div>

            {/* Page Selection */}
            {data.facebook_user_id && (
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

