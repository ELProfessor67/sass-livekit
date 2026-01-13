import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PencilSimple, Sparkle, Lightning, Envelope, ChatCircle, Clock } from "phosphor-react";
import { Node } from "@xyflow/react";
import React, { useState } from "react";
import { TwilioIcon } from "../nodes/IntegrationIcons";
import { Plus, Trash, Info } from "phosphor-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
        case 'delay':
            return <Clock size={20} weight="duotone" className="text-slate-400" />;
        case 'twilio_sms':
            return <TwilioIcon size={20} />;
        default:
            return <Lightning size={20} weight="duotone" className="text-muted-foreground" />;
    }
}

export function NodeConfigPanel({ node, onUpdate, onDelete }: NodeConfigPanelProps) {
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
                            <Input
                                className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                value={data.to_number || ''}
                                onChange={(e) => handleFieldChange('to_number', e.target.value)}
                                placeholder="{phone_number} or direct number"
                            />
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

                {/* Delay Specific Fields */}
                {node.type === 'delay' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Wait For</Label>
                                <Input
                                    type="number"
                                    className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9"
                                    value={data.delay_duration || '1'}
                                    onChange={(e) => handleFieldChange('delay_duration', e.target.value)}
                                    placeholder="1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Unit</Label>
                                <Select
                                    value={data.delay_unit || 'minutes'}
                                    onValueChange={(val) => handleFieldChange('delay_unit', val)}
                                >
                                    <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9">
                                        <SelectValue placeholder="Select unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="minutes">Minutes</SelectItem>
                                        <SelectItem value="hours">Hours</SelectItem>
                                        <SelectItem value="days">Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                {node.type === 'trigger' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Trigger Type</Label>
                            <Select defaultValue="webhook">
                                <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary/50 text-sm h-9">
                                    <SelectValue placeholder="Select trigger..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="webhook">Webhook (Post-Call Event)</SelectItem>
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
                        </div>
                    </div>
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
