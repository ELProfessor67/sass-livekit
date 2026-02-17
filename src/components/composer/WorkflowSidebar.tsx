import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Lightning,
    Clock,
    FolderSimple,
    Users,
    Layout,
    CheckCircle,
    Selection,
    Plus,
    CaretRight,
    CaretDown,
    Globe,
    Export,
    Star
} from 'phosphor-react';
import { useTemplates } from '@/hooks/useTemplates';
import { useWorkflows, useClientAccounts } from '@/hooks/useWorkflows';
import { useWorkflowFolders } from '@/hooks/useWorkflowFolders';
import { useAccountRoleContext } from '@/hooks/useAccountRole';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export type SidebarFilter = 'all' | 'active' | 'paused' | 'templates' | 'starter' | string;

interface WorkflowSidebarProps {
    activeFilter: SidebarFilter;
    onFilterChange: (filter: SidebarFilter) => void;
    className?: string;
}

export function WorkflowSidebar({ activeFilter, onFilterChange, className }: WorkflowSidebarProps) {
    const { role, isPlatformOwner, isAgency, isClient } = useAccountRoleContext();
    const { stats } = useWorkflows();
    const { clients } = useClientAccounts();
    const { folders } = useWorkflowFolders();
    const { platformCount, agencyCount } = useTemplates();

    const [isClientExpanded, setIsClientExpanded] = useState(true);
    const [isFolderExpanded, setIsFolderExpanded] = useState(true);

    const NavItem = ({
        id,
        label,
        icon: Icon,
        count,
        badge,
        indent = false
    }: {
        id: SidebarFilter;
        label: string;
        icon: any;
        count?: number;
        badge?: string;
        indent?: boolean;
    }) => {
        const isActive = activeFilter === id;

        return (
            <button
                onClick={() => onFilterChange(id)}
                className={cn(
                    "w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] transition-all duration-200 border text-left",
                    isActive
                        ? "bg-accent/80 text-accent-foreground border-accent/30"
                        : "hover:bg-muted/30 border-transparent hover:border-border/20",
                    indent && "pl-6"
                )}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Icon
                        weight="duotone"
                        className={cn(
                            "w-3.5 h-3.5 flex-shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground"
                        )}
                    />
                    <span className={cn(
                        "text-sm truncate",
                        isActive ? "text-foreground font-medium" : "text-foreground"
                    )}>
                        {label}
                    </span>
                    {badge && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-primary/5 text-primary border-primary/20">
                            {badge}
                        </Badge>
                    )}
                </div>
                {(count !== undefined && count > 0) && (
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2",
                        isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/50 text-muted-foreground"
                    )}>
                        {count}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div className={cn("flex flex-col h-full bg-transparent border-r border-border/50", className)}>
            <ScrollArea className="flex-1 p-[var(--space-md)]">
                <div className="space-y-1">
                    {/* Main Filters */}
                    <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-foreground">
                        Workflows
                    </div>
                    <NavItem id="all" label="All Workflows" icon={Selection} count={stats.total} />
                    <NavItem id="active" label="Active" icon={CheckCircle} count={stats.active} indent />
                    <NavItem id="paused" label="Paused" icon={Clock} count={stats.paused} indent />
                    <NavItem id="starter" label="Getting Started" icon={Star} count={stats.starter} />

                    <div className="my-2 px-3">
                        <div className="h-px bg-border/60 dark:bg-white/[0.08]" />
                    </div>

                    {/* Templates Section - Platform/Agency focused */}
                    {!isClient && (
                        <>
                            <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-foreground">
                                Library
                            </div>
                            <NavItem id="templates" label="Templates" icon={Layout} count={isAgency ? agencyCount : platformCount} />
                            {isAgency && (
                                <NavItem id="platform_templates" label="Platform Templates" icon={Globe} count={platformCount} />
                            )}
                            <div className="my-2 px-3">
                                <div className="h-px bg-border/60 dark:bg-white/[0.08]" />
                            </div>
                        </>
                    )}

                    {/* Agency View: Client Workspaces */}
                    {isAgency && (
                        <>
                            <div
                                className="px-3 py-1.5 flex items-center justify-between cursor-pointer group"
                                onClick={() => setIsClientExpanded(!isClientExpanded)}
                            >
                                <span className="text-[10px] font-medium uppercase tracking-wider text-foreground">Workspaces</span>
                                <CaretDown className={cn("w-3 h-3 text-muted-foreground transition-transform", isClientExpanded && "rotate-180")} />
                            </div>

                            {isClientExpanded && (
                                <div className="space-y-0.5">
                                    {clients?.map(client => (
                                        <NavItem
                                            key={client.id}
                                            id={`client-${client.id}`}
                                            label={client.name}
                                            icon={Users}
                                            count={client.workflow_count}
                                            indent
                                        />
                                    ))}
                                    <button
                                        className="w-full flex items-center gap-2 px-6 py-2 text-xs text-foreground hover:text-foreground/80 transition-colors"
                                    >
                                        <Plus size={12} weight="bold" />
                                        Deploy to Client
                                    </button>
                                </div>
                            )}
                            <div className="my-2 px-3">
                                <div className="h-px bg-border/60 dark:bg-white/[0.08]" />
                            </div>
                        </>
                    )}

                    {/* Client View: Folders */}
                    {isClient && (
                        <>
                            <div
                                className="px-3 py-1.5 flex items-center justify-between cursor-pointer group"
                                onClick={() => setIsFolderExpanded(!isFolderExpanded)}
                            >
                                <span className="text-[10px] font-medium uppercase tracking-wider text-foreground">Folders</span>
                                <CaretDown className={cn("w-3 h-3 text-muted-foreground transition-transform", isFolderExpanded && "rotate-180")} />
                            </div>

                            {isFolderExpanded && (
                                <div className="space-y-0.5">
                                    {folders?.map(folder => (
                                        <NavItem
                                            key={folder.id}
                                            id={`folder-${folder.id}`}
                                            label={folder.name}
                                            icon={FolderSimple}
                                            count={folder.workflow_count}
                                            indent
                                        />
                                    ))}
                                    <button
                                        className="w-full flex items-center gap-2 px-6 py-2 text-xs text-primary hover:text-primary/80 transition-colors"
                                    >
                                        <Plus size={12} weight="bold" />
                                        New Folder
                                    </button>
                                </div>
                            )}
                            <div className="my-2 px-3">
                                <div className="h-px bg-border/60 dark:bg-white/[0.08]" />
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>

            {/* Sidebar Footer Actions */}
            <div className="p-[var(--space-md)] mt-auto border-t border-border/50">
                {isAgency ? (
                    <Button className="w-full gap-2" size="sm">
                        <Export size={16} weight="bold" />
                        Deploy to Client
                    </Button>
                ) : isClient ? (
                    <Button variant="outline" className="w-full gap-2 border-dashed" size="sm">
                        <Plus size={16} weight="bold" />
                        New Folder
                    </Button>
                ) : isPlatformOwner && (
                    <Button className="w-full gap-2" size="sm">
                        <Lightning size={16} weight="bold" />
                        New Starter Flow
                    </Button>
                )}
            </div>
        </div>
    );
}
