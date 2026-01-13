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
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm group",
                    isActive
                        ? "bg-primary/20 text-primary font-semibold shadow-[0_4px_12px_rgba(var(--primary),0.2)] border border-primary/20"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent hover:border-white/5",
                    indent && "pl-8"
                )}
            >
                <div className="flex items-center gap-2.5">
                    <Icon size={18} weight={isActive ? "fill" : "regular"} className={isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} />
                    <span>{label}</span>
                    {badge && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-primary/5 text-primary border-primary/20">
                            {badge}
                        </Badge>
                    )}
                </div>
                {(count !== undefined && count > 0) && (
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border",
                        isActive ? "bg-primary/20 border-primary/20 text-primary" : "bg-muted border-border/50 text-muted-foreground"
                    )}>
                        {count}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div className={cn("flex flex-col h-full bg-white/[0.01] backdrop-blur-xl border-r border-white/[0.08]", className)}>
            <ScrollArea className="flex-1 px-4 py-6">
                <div className="space-y-8">
                    {/* Main Filters */}
                    <div className="space-y-1">
                        <NavItem id="all" label="All Workflows" icon={Selection} count={stats.total} />
                        <NavItem id="active" label="Active" icon={CheckCircle} count={stats.active} />
                        <NavItem id="paused" label="Paused" icon={Clock} count={stats.paused} />
                        <NavItem id="starter" label="Getting Started" icon={Star} count={stats.starter} />
                    </div>

                    {/* Templates Section - Platform/Agency focused */}
                    {!isClient && (
                        <div className="space-y-2">
                            <div className="px-3 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Library</span>
                            </div>
                            <div className="space-y-1">
                                <NavItem id="templates" label="Templates" icon={Layout} count={isAgency ? agencyCount : platformCount} />
                                {isAgency && (
                                    <NavItem id="platform_templates" label="Platform Templates" icon={Globe} count={platformCount} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Agency View: Client Workspaces */}
                    {isAgency && (
                        <div className="space-y-2">
                            <div
                                className="px-3 flex items-center justify-between cursor-pointer group"
                                onClick={() => setIsClientExpanded(!isClientExpanded)}
                            >
                                <div className="flex items-center gap-1.5">
                                    {isClientExpanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Client Workspaces</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100">
                                    <Plus size={10} />
                                </Button>
                            </div>

                            {isClientExpanded && (
                                <div className="space-y-0.5 ml-1 border-l border-border/40 pl-1.5">
                                    {clients?.map(client => (
                                        <button
                                            key={client.id}
                                            onClick={() => onFilterChange(`client-${client.id}`)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all text-[13px]",
                                                activeFilter === `client-${client.id}`
                                                    ? "bg-blue-500/10 text-blue-500 font-medium"
                                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Users size={14} weight={activeFilter === `client-${client.id}` ? "fill" : "regular"} />
                                                <span className="truncate max-w-[120px]">{client.name}</span>
                                            </div>
                                            <span className="text-[10px] opacity-60">{client.workflow_count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Client View: Folders */}
                    {isClient && (
                        <div className="space-y-2">
                            <div
                                className="px-3 flex items-center justify-between cursor-pointer group"
                                onClick={() => setIsFolderExpanded(!isFolderExpanded)}
                            >
                                <div className="flex items-center gap-1.5">
                                    {isFolderExpanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Folders</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100">
                                    <Plus size={10} />
                                </Button>
                            </div>

                            {isFolderExpanded && (
                                <div className="space-y-0.5 ml-1 border-l border-border/40 pl-1.5">
                                    {folders?.map(folder => (
                                        <button
                                            key={folder.id}
                                            onClick={() => onFilterChange(`folder-${folder.id}`)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all text-[13px]",
                                                activeFilter === `folder-${folder.id}`
                                                    ? "bg-primary/10 text-primary font-medium"
                                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <FolderSimple size={14} weight={activeFilter === `folder-${folder.id}` ? "fill" : "regular"} />
                                                <span className="truncate max-w-[120px]">{folder.name}</span>
                                            </div>
                                            <span className="text-[10px] opacity-60">{folder.workflow_count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Sidebar Footer Actions - Glass UI */}
            <div className="p-5 border-t border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
                {isAgency ? (
                    <Button className="w-full gap-2 shadow-sm" size="sm">
                        <Export size={16} />
                        Deploy to Client
                    </Button>
                ) : isClient ? (
                    <Button variant="outline" className="w-full gap-2 border-dashed" size="sm">
                        <Plus size={16} />
                        New Folder
                    </Button>
                ) : isPlatformOwner && (
                    <Button className="w-full gap-2" size="sm">
                        <Lightning size={16} />
                        New Starter Flow
                    </Button>
                )}
            </div>
        </div>
    );
}
