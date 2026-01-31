import type React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { CaretRight, CaretLeft, X } from "phosphor-react";
import {
    integrationActions,
    integrationTriggers,
    triggerCategories,
    actionCategories,
    getIntegrationIcon,
    IntegrationAction
} from "../data/integrationActions";

interface NodeSelectionPanelProps {
    onClose: () => void;
    onSelect: (nodeType: string, nodeData: any) => void;
    context?: 'trigger' | 'action';
}

interface NodeCardProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick: () => void;
}

function NodeCard({ icon, label, description, onClick }: NodeCardProps) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.05] dark:hover:bg-white/[0.08] transition-all group text-left"
        >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block">{label}</span>
                <span className="text-xs text-muted-foreground truncate block">{description}</span>
            </div>
            <CaretRight size={16} weight="bold" className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
}

interface IntegrationActionsViewProps {
    integration: string;
    onBack: () => void;
    onSelectAction: (action: IntegrationAction) => void;
    isTrigger?: boolean;
}

function IntegrationActionsView({ integration, onBack, onSelectAction, isTrigger = false }: IntegrationActionsViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const actions = (isTrigger ? integrationTriggers : integrationActions)[integration] || [];
    const icon = getIntegrationIcon(integration, 28);

    const filteredActions = actions.filter(action =>
        action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col">
            {/* Header with back button */}
            <div className="p-4 border-b border-white/[0.08]">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-3"
                >
                    <CaretLeft size={16} weight="bold" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-white/5 rounded-lg border border-white/10">
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">{integration}</h3>
                        <p className="text-xs text-muted-foreground font-medium">Select a {isTrigger ? 'trigger' : 'action'}</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-white/[0.08]">
                <Input
                    placeholder={`Search ${integration} ${isTrigger ? 'triggers' : 'actions'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 backdrop-blur-sm bg-white/[0.03] dark:bg-white/[0.05] border-white/[0.08]"
                />
            </div>

            {/* Actions List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-1">
                    {filteredActions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm font-medium">
                            No {isTrigger ? 'triggers' : 'actions'} found
                        </div>
                    ) : (
                        filteredActions.map((action) => (
                            <NodeCard
                                key={action.id}
                                icon={icon}
                                label={action.label}
                                description={action.description}
                                onClick={() => onSelectAction(action)}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

export function NodeSelectionPanel({ onClose, onSelect, context = 'action' }: NodeSelectionPanelProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

    const handleIntegrationClick = (node: any) => {
        if (node.type === 'condition' || node.type === 'router' || node.type === 'call_lead') {
            onSelect(node.type, {
                label: node.label,
                type: node.type,
                branches: node.type === 'router' ? [] : undefined,
                configured: false,
            });
            onClose();
            return;
        }
        setSelectedIntegration(node.label);
    };

    const handleActionSelect = (action: IntegrationAction) => {
        let nodeType: string = context === 'trigger' ? 'trigger' : 'action';

        if (selectedIntegration === 'Twilio') {
            nodeType = 'twilio_sms';
        } else if (selectedIntegration === 'Call Lead' || action.id === 'call_lead') {
            nodeType = 'call_lead';
        } else if (context === 'trigger' || action.id === 'facebook_leads') {
            nodeType = 'trigger';
        }

        onSelect(nodeType, {
            label: action.label,
            integration: selectedIntegration,
            actionId: action.id,
            type: nodeType,
            trigger_type: nodeType === 'trigger' ? action.id : undefined,
            configured: false,
            to_number: selectedIntegration === 'Twilio' ? '{phone_number}' : undefined,
            method: selectedIntegration === 'HTTP Request' ? action.id.split('_')[0].toUpperCase() : undefined,
        });
        onClose();
    };

    const handleBack = () => {
        setSelectedIntegration(null);
    };

    // Show actions view when integration is selected
    if (selectedIntegration) {
        return (
            <IntegrationActionsView
                integration={selectedIntegration}
                onBack={handleBack}
                onSelectAction={handleActionSelect}
                isTrigger={context === 'trigger'}
            />
        );
    }

    const categories = context === 'trigger' ? triggerCategories : actionCategories;

    const filteredCategories = categories.map(category => ({
        ...category,
        nodes: category.nodes.filter(node =>
            node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    })).filter(category => category.nodes.length > 0);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/[0.08]">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-semibold text-foreground tracking-tight">
                        {context === 'trigger' ? 'Add Trigger' : 'Add Action'}
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                    {context === 'trigger' ? 'How should this workflow start?' : 'What should happen next?'}
                </p>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-white/[0.08]">
                <Input
                    placeholder={`Search ${context === 'trigger' ? 'triggers' : 'actions'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 backdrop-blur-sm bg-white/[0.03] dark:bg-white/[0.05] border-white/[0.08]"
                />
            </div>

            {/* Actions List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm font-medium">
                            No {context === 'trigger' ? 'triggers' : 'actions'} found
                        </div>
                    ) : (
                        filteredCategories.map((category) => (
                            <div key={category.name} className="space-y-1.5">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-2 mb-1">
                                    {category.name}
                                </h4>
                                <div className="space-y-0.5">
                                    {category.nodes.map((node) => (
                                        <NodeCard
                                            key={node.label}
                                            icon={getIntegrationIcon(node.label, 24)}
                                            label={node.label}
                                            description={node.description}
                                            onClick={() => handleIntegrationClick(node)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
