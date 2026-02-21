import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
    SidebarFilter,
    WorkflowSidebar
} from '@/components/composer/WorkflowSidebar';
import { WorkflowTable } from '@/components/composer/WorkflowTable';
import { CreateWorkflowDialog } from '@/components/composer/CreateWorkflowDialog';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useAccountRoleContext } from '@/hooks/useAccountRole';
import { AccountRoleProvider } from '@/components/composer/AccountRoleProvider';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Plus, Lightning, Layout } from 'phosphor-react';
import { RoleSwitcher } from '@/components/composer/RoleSwitcher';
import { ThemeCard } from '@/components/theme/ThemeCard';
import DashboardLayout from "@/layout/DashboardLayout";
import WorkflowsHeader from "@/components/composer/WorkflowsHeader";
import { ThemeContainer, ThemeSection } from "@/components/theme";

function ComposerContent() {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState<SidebarFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const { isAgency } = useAccountRoleContext();

    const { workflows, isLoading, createWorkflow } = useWorkflows({
        status: activeFilter === 'active' || activeFilter === 'paused' ? activeFilter as any : undefined,
    });

    const filteredWorkflows = useMemo(() => {
        if (!workflows) return [];

        let result = workflows;

        // Filter by search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(w =>
                w.name.toLowerCase().includes(q) ||
                w.description?.toLowerCase().includes(q)
            );
        }

        // Filter by client/folder tags in the ID
        if (activeFilter.startsWith('client-')) {
            const clientId = activeFilter.replace('client-', '');
            result = result.filter(w => w.account_id === clientId);
        } else if (activeFilter.startsWith('folder-')) {
            const folderId = activeFilter.replace('folder-', '');
            result = result.filter(w => w.folder_id === folderId);
        }

        return result;
    }, [workflows, searchQuery, activeFilter]);

    const totalExecutions = useMemo(() => {
        return workflows?.reduce((acc, w) => acc + (w.completed_count || 0), 0) || 0;
    }, [workflows]);

    const handleCreateWorkflow = (name: string, description: string, category: string) => {
        createWorkflow.mutate({
            name,
            description,
            category,
            status: 'draft',
            source_type: 'scratch',
        }, {
            onSuccess: (data) => {
                navigate(`/workflows/${data.id}`);
            }
        });
    };

    return (
        <ThemeContainer variant="base" className="min-h-screen no-hover-scaling py-12">
            <div className="container mx-auto px-6">
                <div className="max-w-6xl mx-auto">
                    <ThemeSection spacing="lg">
                        {/* Header */}
                        <div className="flex flex-col space-y-[var(--space-md)] sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-[28px] font-light tracking-[0.2px] text-foreground">
                                        Composer
                                    </h1>
                                    <Badge variant="secondary" className="text-xs">Beta</Badge>
                                    <RoleSwitcher variant="compact" />
                                </div>
                                <p className="text-muted-foreground text-sm font-medium tracking-[0.1px] mt-1">
                                    Compose and automate workflows for your operations
                                </p>
                            </div>
                            <div className="flex items-center gap-[var(--space-sm)]">
                                <SearchInput
                                    placeholder="Search workflows..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-64"
                                />
                                <Button
                                    className="gap-2"
                                    onClick={() => setShowCreateDialog(true)}
                                >
                                    <Plus weight="bold" size={16} />
                                    Create
                                </Button>
                            </div>
                        </div>

                        <ThemeCard variant="glass" className="flex rounded-3xl overflow-hidden min-h-[calc(100vh-14rem)] border border-white/5 shadow-2xl">
                            {/* Left Panel - Sidebar */}
                            <WorkflowSidebar
                                className="w-64 shrink-0 border-r border-border/10 bg-transparent"
                                activeFilter={activeFilter}
                                onFilterChange={setActiveFilter}
                            />

                            {/* Main Content Area */}
                            <div className="flex-1 flex flex-col min-w-0 bg-transparent">

                                {/* Scrollable Table Area */}
                                <main className="flex-1 overflow-auto p-8">
                                    <div className="space-y-8">
                                        {/* Context Summary / Stats */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <ThemeCard variant="glass" className="p-6 flex items-center gap-5 border border-white/[0.05] bg-white/[0.01]">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                                    <Lightning size={24} weight="fill" />
                                                </div>
                                                <div>
                                                    <div className="text-3xl font-bold tracking-tight">{totalExecutions}</div>
                                                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Total Executions</div>
                                                </div>
                                            </ThemeCard>
                                            <ThemeCard variant="glass" className="p-6 flex items-center gap-5 border border-white/[0.05] bg-white/[0.01]">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                                                    <Layout size={24} weight="fill" />
                                                </div>
                                                <div>
                                                    <div className="text-3xl font-bold tracking-tight">{workflows?.length || 0}</div>
                                                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Total Flows</div>
                                                </div>
                                            </ThemeCard>
                                            <ThemeCard variant="glass" className="p-6 flex items-center gap-5 border-dashed border-primary/20 bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer group">
                                                <div className="w-full flex items-center justify-center gap-2 text-primary font-medium">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Plus size={16} />
                                                    </div>
                                                    <span className="text-sm">Explore templates gallery</span>
                                                </div>
                                            </ThemeCard>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
                                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/90 flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] animate-pulse" />
                                                    {activeFilter === 'all' ? 'All Workflows' : activeFilter}
                                                </h2>
                                                <div className="flex items-center gap-2">
                                                    <button className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/5 rounded-md transition-colors">Recent</button>
                                                    <button className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/5 rounded-md transition-colors">A-Z</button>
                                                </div>
                                            </div>

                                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                                                <WorkflowTable
                                                    workflows={filteredWorkflows}
                                                    isLoading={isLoading}
                                                    onWorkflowClick={(id) => navigate(`/workflows/${id}`)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </main>
                            </div>
                        </ThemeCard>
                    </ThemeSection>
                </div>
            </div>
            <CreateWorkflowDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onCreate={handleCreateWorkflow}
            />

            {/* Dev Role Indicator (Full size) */}
            <RoleSwitcher />
        </ThemeContainer>
    );
}

export default function ComposerPage() {
    return (
        <AccountRoleProvider>
            <DashboardLayout>
                <ComposerContent />
            </DashboardLayout>
        </AccountRoleProvider>
    );
}
